const {Router} = require('express')
const authController = require("../controllers/auth.controller")
const loginUserController = require("../controllers/auth.controller")
const authMiddleware = require("../middleware/auth.middleware")

const authRouter = Router() 


/**
 * @route POST  /api/auth/register
 * @description Register a new user 
 * @access Public
*/

authRouter.post("/register", authController.registerUserController)



/**
 * @route POST /api/auth/login
 * @description login user with email and password
 * @ access Public
 */

authRouter.post("/login", authController.loginUserController) 


/**
 * @rotue GET/api/auth/logout 
 * @description clear token from user cookie and add the token in blacklist
 * @access public 
*/
authRouter.post("/logout", authController.logoutUserController)


/**
 * @rotue GET /api/auth/get-me 
 * @description get the current logged in user details
 * @access private 
 */

authRouter.get("/get-me",authMiddleware.authUser, authController.getMeController)


module.exports = authRouter