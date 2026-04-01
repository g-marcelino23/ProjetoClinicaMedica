const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

const authRoutes = require('./routes/authRoutes');
const pacienteRoutes = require('./routes/pacienteRoutes');
const medicoRoutes = require('./routes/medicoRoutes');
const agendaRoutes = require('./routes/agendaRoutes');
const consultaRoutes = require('./routes/consultaRoutes');
const prontuarioRoutes = require('./routes/prontuarioRoutes');
const prescricaoRoutes = require('./routes/prescricaoRoutes');
const exameRoutes = require('./routes/exameRoutes');
const portalPacienteRoutes = require('./routes/portalPacienteRoutes');
const checkinRoutes = require('./routes/checkinRoutes');
const notificacaoRoutes = require('./routes/notificacaoRoutes');
const listaEsperaRoutes = require('./routes/listaEsperaRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const relatorioRoutes = require('./routes/relatorioRoutes');
const indicadorRoutes = require('./routes/indicadorRoutes');

const authMiddleware = require('./middlewares/authMiddleware');
const roleMiddleware = require('./middlewares/roleMiddleware');

app.use('/auth', authRoutes);
app.use('/pacientes', pacienteRoutes);
app.use('/medicos', medicoRoutes);
app.use('/agendas', agendaRoutes);
app.use('/consultas', consultaRoutes);
app.use('/prontuarios', prontuarioRoutes);
app.use('/prescricoes', prescricaoRoutes);
app.use('/exames', exameRoutes);
app.use('/portal/paciente', portalPacienteRoutes);
app.use('/checkin', checkinRoutes);
app.use('/notificacoes', notificacaoRoutes);
app.use('/lista-espera', listaEsperaRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/relatorios', relatorioRoutes);
app.use('/indicadores', indicadorRoutes);

app.get('/', (req, res) => {
  res.json({ mensagem: 'API do sistema médico funcionando!' });
});

app.get('/protegida', authMiddleware, (req, res) => {
  res.json({
    mensagem: 'Rota protegida funcionando!',
    usuario: req.usuario
  });
});

app.get('/paciente', authMiddleware, roleMiddleware(['PACIENTE']), (req, res) => {
  res.json({ mensagem: 'Área do paciente' });
});

app.get('/medico', authMiddleware, roleMiddleware(['MEDICO']), (req, res) => {
  res.json({ mensagem: 'Área do médico' });
});

app.get('/secretario', authMiddleware, roleMiddleware(['SECRETARIO']), (req, res) => {
  res.json({ mensagem: 'Área do secretário' });
});

module.exports = app;