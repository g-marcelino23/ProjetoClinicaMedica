const roleMiddleware = (rolesPermitidos) => {
    return (req, res, next) => {
        if (!req.usuario || !req.usuario.perfil) {
            return res.status(401).json({
                erro: 'Usuário não autenticado'
            });
        }

        const perfil = req.usuario.perfil;

        if (!rolesPermitidos.includes(perfil)) {
            return res.status(403).json({
                erro: 'Acesso negado'
            });
        }

        next();
    };
};

module.exports = roleMiddleware;