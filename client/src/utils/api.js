import login from "./auth/login";
import logout from "./auth/logout";
import refreshAccessToken from "./auth/refreshAccessToken";
import signup from "./auth/signup";
import get from "./methods/get";
import post from "./methods/post";
import disableMFA from "./mfa/disableMFA";
import getMFASetup from "./mfa/getMFASetup";
import verifyMFA from "./mfa/verifyMFA";
import getConnectedAccounts from "./oauth/getConnectedAccounts";
import unlinkProvider from "./oauth/unlinkProvider";
import editProfile from "./profile/editProfile";
import getUserProfile from "./profile/getUserProfile";
import updateUserTheme from "./profile/updateUserTheme";
import addRecipe from "./recipes/addRecipe";
import deleteRecipe from "./recipes/deleteRecipe";
import getRecipesTable from "./recipes/getRecipesTable";
import getUsersTable from "./users/getUsersTable";

export const API_URL = import.meta.env.VITE_NODE_ENV === 'production' 
    ? import.meta.env.VITE_PROD_URL
    : import.meta.env.VITE_DEV_URL;

export const api = {

    // auth
    login,
    logout,
    refreshAccessToken,
    signup,

    // methods
    get,
    post,

    // mfa
    disableMFA,
    getMFASetup,
    verifyMFA,

    // oauth
    getConnectedAccounts,
    unlinkProvider,

    // profile
    editProfile,
    getUserProfile,
    updateUserTheme,

    // recipes
    addRecipe,
    deleteRecipe,
    getRecipesTable,

    // users
    getUsersTable,
};
