const Joi = require('@hapi/joi')

const registerValidation =  (data) => {
    const schema = Joi.object({
        name: Joi.string()
            .min(2)
            .required(),
        email: Joi.string()
            .required()
            .email(),
        password: Joi.string()
            .min(6)
            .required()
    })

    // Validation before user creation
    return schema.validate(data)
}

const loginValidation = (data) => {
    const schema = Joi.object({
        email: Joi.string()
            .required()
            .email(),
        password: Joi.string()
            .min(6)
            .required()
    })

    // Validation before user login
    return schema.validate(data)
}

module.exports.registerValidation = registerValidation
module.exports.loginValidation = loginValidation