const { unprotectObject } = require('../utils/dataProtection')

const dataProtectionResponseMiddleware = (req, res, next) => {
  const sendJson = res.json.bind(res)

  res.json = (body) => sendJson(unprotectObject(body))
  next()
}

module.exports = dataProtectionResponseMiddleware
