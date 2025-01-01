#!/bin/bash

# shellcheck disable=SC1091

RED="\033[01;31m"
#GREEN="\033[01;32m"
YELLOW="\033[01;33m"
BOLD="\033[01;01m"
RESET="\033[00m"

CURRENT_DIR=$(pwd)
SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
CONFIG_FILE="$SCRIPT_DIR/../config.ini"

db_create () {
	sudo -u postgres psql -c "drop database recipe_archiver with (force)" >/dev/null 2>&1
	sudo -u postgres psql -c "create database recipe_archiver" >/dev/null 2>&1
	sudo -u postgres psql -c "drop user recipe_archiver" >/dev/null 2>&1
	sudo -u postgres psql -c "create user recipe_archiver with encrypted password '$1'" >/dev/null 2>&1
	sudo -u postgres psql -c "grant all privileges on database recipe_archiver to recipe_archiver" >/dev/null 2>&1
    echo '\c recipe_archiver postgres' > db_create.psql
    echo 'grant all on schema public to recipe_archiver' >> db_create.psql
    sudo -u postgres psql -f db_create.psql >/dev/null 2>&1
    rm -f db_create.psql
}

sudo apt-get update || exit
sudo apt-get install -y git python3 python3-venv python3-dev postgresql build-essential libpq-dev libgl1 redis libnss3-tools mkcert nginx libpcre3 libpcre3-dev uuid-dev libcap-dev

if [ ! -f "$CONFIG_FILE" ]; then
    cp "$SCRIPT_DIR/config.ini.sample" "$CONFIG_FILE"
    secret_key=$(python -c "import secrets; print(secrets.token_hex())")
    security_password_salt=$(python3 -c "import secrets; print(secrets.token_hex())")
	jwt_secret_key=$(python3 -c "import secrets; print(secrets.token_hex())")
    sed -i "s/secret_key.*/secret_key: $secret_key/" "$CONFIG_FILE"
    sed -i "s/security_password_salt.*/security_password_salt: $security_password_salt/" "$CONFIG_FILE"
	sed -i "s/jwt_secret_key.*/jwt_secret_key: $jwt_secret_key/" "$CONFIG_FILE"
fi

cd ~postgres/ || exit 1
check_database=$(sudo -u postgres psql -c "\\l" | grep recipe_archiver)
continue_setup=""
set +H
postgres_password=$(tr -dc 'A-Za-z0-9!$@%^*()=?' < /dev/urandom | head -c 65)
if [ -n "$check_database" ]; then
	while [ -z "$continue_setup" ]; do
		echo;echo -e "${BOLD}${RED}[!] Database ${RESET}recipe_archiver ${BOLD}${RED}already exists.${RESET}"
		echo -e "${BOLD}${YELLOW}[?] Do you want to wipe the database before continuing setup?${RESET}"
		read -rp "(y/n): " continue_setup
		if [ "$continue_setup" = "y" ]; then
            sed -i "39s/.*/password: \"$postgres_password\"/" "$CONFIG_FILE"
			db_create "$postgres_password"
		elif [ "$continue_setup" = "n" ]; then
			break
		else
			continue_setup=""
		fi
	done
else
    sed -i "39s/.*/password: $postgres_password/" "$CONFIG_FILE"
	db_create "$postgres_password"
fi
set -H; echo

cd "$SCRIPT_DIR/.." || exit 1

mkcert -install >/dev/null 2>&1
if [ ! -f 'ra-key.pem' ]; then
    mkcert -cert-file 'ra.pem' -key-file 'ra-key.pem' "$(ip -4 addr | grep -oP '(?<=inet\s)\d+(\.\d+){3}' | tr '\n' ' ' | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')"
fi

cd "$SCRIPT_DIR" || exit 1

if [[ -n $(python3 -m pip --version 2>&1 >/dev/null) ]]; then
    wget -nc https://bootstrap.pypa.io/get-pip.py
    python3 get-pip.py
    rm -f get-pip.py
fi

deactivate 2>/dev/null
python3 -m pip install --root-user-action=ignore --upgrade pip setuptools wheel
python3 -m pip install --root-user-action=ignore --upgrade virtualenv virtualenvwrapper
cd ..
rm -rf recipe-archiver-env
python3 -m venv recipe-archiver-env
source recipe-archiver-env/bin/activate
python3 -m pip install --upgrade pip setuptools wheel
python3 -m pip install -r requirements.txt
python3 -m pip uninstall -y uwsgi >/dev/null 2>&1 
python3 -m pip install uwsgi -I --no-cache-dir
wget -qnc -O uwsgi.tar.gz https://projects.unbit.it/downloads/uwsgi-latest.tar.gz
tar --strip-components=1 --wildcards -xzf uwsgi.tar.gz uwsgi*/plugins/python uwsgi*/plugins/gevent
PYTHON=python3.10 uwsgi --build-plugin "plugins/python python310"
PYTHON=python3.10 uwsgi --build-plugin "plugins/gevent gevent310"
mv ./*_plugin.so uwsgi/
rm -rf plugins/ uwsgi.tar.gz
rm -rf migrations
flask db init
flask db migrate
flask db upgrade
encryption_key=$(python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode('utf-8'))")
sed -i "s/encryption_key.*/encryption_key: $encryption_key/" "$CONFIG_FILE"
deactivate

mkdir -p static/react
cd client/ || exit 1
npm install -D \
	@headlessui/react \
	@heroicons/react \
	@tanstack/react-table \
	@vitejs/plugin-react \
	autoprefixer \
	dayjs \
	gridjs-react \
	jwt-decode \
	postcss \
	react \
	react-dom \
	react-error-boundary \
	react-google-recaptcha \
	react-google-recaptcha-v3 \
	react-router-dom \
	react-toastify \
	socket.io-client \
	tailwindcss \
	vite
npx tailwindcss init -p
npm run build

cd "$CURRENT_DIR" || exit 1
