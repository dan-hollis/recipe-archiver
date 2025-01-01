from pathlib import Path

import yaml


def load_config():
    config_file_path = Path(__file__).parent.parent / 'config.yml'
    config = yaml.safe_load(config_file_path.read_text(encoding='utf-8'))
    return config
