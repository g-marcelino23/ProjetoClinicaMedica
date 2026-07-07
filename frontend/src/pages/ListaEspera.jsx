import { useEffect, useState } from "react";
import MainLayout from "../components/layout/MainLayout";

function ListaEspera() {
  const [lista, setLista] = useState([]);
  const [pacientes, setPacientes] = useState([]);
  const [medicos, setMedicos] = useState([]);

  const [pacienteId, setPacienteId] = useState("");
  const [medicoId, setMedicoId] = useState("");
  const [especialidade, setEspecialidade] = useState("");
  const [dataDesejada, setDataDesejada] = useState("");

  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  const API_URL = "http://localhost:3001";

  const getToken = () => {
    return sessionStorage.getItem("token") || localStorage.getItem("token");
  };

  const extrairLista = (dados, chavePrincipal) => {
    if (Array.isArray(dados)) {
      return dados;
    }

    if (Array.isArray(dados[chavePrincipal])) {
      return dados[chavePrincipal];
    }

    if (Array.isArray(dados.data)) {
      return dados.data;
    }

    if (Array.isArray(dados.items)) {
      return dados.items;
    }

    return [];
  };

  const carregarLista = async () => {
    try {
      const resposta = await fetch(`${API_URL}/lista-espera`, {
        headers: {
          Authorization: `Bearer ${getToken()}`
        }
      });

      const dados = await resposta.json();

      if (!resposta.ok) {
        throw new Error(dados.erro || "Erro ao carregar lista de espera");
      }

      console.log("LISTA DE ESPERA RETORNADA:", dados);

      const listaTratada = extrairLista(dados, "lista");
      setLista(listaTratada);
    } catch (error) {
      console.error("Erro ao carregar lista de espera:", error);
      setErro(error.message);
    }
  };

  const carregarPacientes = async () => {
    try {
      const resposta = await fetch(`${API_URL}/pacientes`, {
        headers: {
          Authorization: `Bearer ${getToken()}`
        }
      });

      const dados = await resposta.json();

      if (!resposta.ok) {
        throw new Error(dados.erro || "Erro ao carregar pacientes");
      }

      console.log("PACIENTES RETORNADOS:", dados);

      const listaPacientes = extrairLista(dados, "pacientes");
      setPacientes(listaPacientes);
    } catch (error) {
      console.error("Erro ao carregar pacientes:", error);
      setErro(error.message);
    }
  };

  const carregarMedicos = async () => {
    try {
      const resposta = await fetch(`${API_URL}/medicos`, {
        headers: {
          Authorization: `Bearer ${getToken()}`
        }
      });

      const dados = await resposta.json();

      if (!resposta.ok) {
        throw new Error(dados.erro || "Erro ao carregar médicos");
      }

      console.log("MÉDICOS RETORNADOS:", dados);

      const listaMedicos = extrairLista(dados, "medicos");
      setMedicos(listaMedicos);
    } catch (error) {
      console.error("Erro ao carregar médicos:", error);
      setErro(error.message);
    }
  };

  const nomePaciente = (paciente) => {
    return (
      paciente.nome ||
      paciente.paciente_nome ||
      paciente.usuario_nome ||
      paciente.nome_usuario ||
      paciente.nome_paciente ||
      `Paciente #${paciente.id}`
    );
  };

  const nomeMedico = (medico) => {
    return (
      medico.nome ||
      medico.medico_nome ||
      medico.usuario_nome ||
      medico.nome_usuario ||
      medico.nome_medico ||
      `Médico #${medico.id}`
    );
  };

  const obterEspecialidadeMedico = (medico) => {
    return (
      medico.especialidade ||
      medico.especialidade_medica ||
      medico.area ||
      medico.area_atuacao ||
      medico.crm_especialidade ||
      ""
    );
  };

  const selecionarMedico = (idMedico) => {
    setMedicoId(idMedico);

    if (!idMedico) {
      setEspecialidade("");
      return;
    }

    const medicoSelecionado = medicos.find(
      (medico) => Number(medico.id) === Number(idMedico)
    );

    if (medicoSelecionado) {
      setEspecialidade(obterEspecialidadeMedico(medicoSelecionado));
    }
  };

  const cadastrarNaLista = async (e) => {
    e.preventDefault();

    setMensagem("");
    setErro("");

    if (!pacienteId) {
      setErro("Selecione um paciente.");
      return;
    }

    try {
      setCarregando(true);

      const resposta = await fetch(`${API_URL}/lista-espera`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`
        },
        body: JSON.stringify({
          paciente_id: Number(pacienteId),
          medico_id: medicoId ? Number(medicoId) : null,
          especialidade: especialidade || null,
          data_desejada: dataDesejada || null
        })
      });

      const dados = await resposta.json();

      if (!resposta.ok) {
        throw new Error(dados.erro || "Erro ao cadastrar na lista de espera");
      }

      setMensagem("Paciente adicionado à lista de espera com sucesso!");

      setPacienteId("");
      setMedicoId("");
      setEspecialidade("");
      setDataDesejada("");

      await carregarLista();
    } catch (error) {
      console.error("Erro ao cadastrar na lista:", error);
      setErro(error.message);
    } finally {
      setCarregando(false);
    }
  };

  const alterarStatus = async (id, acao) => {
    setMensagem("");
    setErro("");

    try {
      const resposta = await fetch(`${API_URL}/lista-espera/${id}/${acao}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${getToken()}`
        }
      });

      const dados = await resposta.json();

      if (!resposta.ok) {
        throw new Error(dados.erro || "Erro ao atualizar item");
      }

      setMensagem(dados.mensagem || "Status atualizado com sucesso!");
      await carregarLista();
    } catch (error) {
      console.error("Erro ao alterar status:", error);
      setErro(error.message);
    }
  };

  const formatarData = (data) => {
    if (!data) {
      return "Não informada";
    }

    return new Date(data).toLocaleDateString("pt-BR");
  };

  useEffect(() => {
    carregarLista();
    carregarPacientes();
    carregarMedicos();
  }, []);

  return (
    <MainLayout>
      <div className="container mt-4">
        <h2>Lista de Espera</h2>

        <p className="text-muted">
          Gerencie pacientes que aguardam disponibilidade para consulta.
        </p>

        {mensagem && <div className="alert alert-success">{mensagem}</div>}

        {erro && <div className="alert alert-danger">{erro}</div>}

        <div className="card mb-4">
          <div className="card-header">Adicionar paciente à lista</div>

          <div className="card-body">
            <form onSubmit={cadastrarNaLista}>
              <div className="row">
                <div className="col-md-3 mb-3">
                  <label className="form-label">Paciente</label>

                  <select
                    className="form-select"
                    value={pacienteId}
                    onChange={(e) => setPacienteId(e.target.value)}
                    required
                  >
                    <option value="">Selecione um paciente</option>

                    {pacientes.map((paciente) => (
                      <option key={paciente.id} value={paciente.id}>
                        {nomePaciente(paciente)}
                      </option>
                    ))}
                  </select>

                  {pacientes.length === 0 && (
                    <small className="text-muted">
                      Nenhum paciente carregado.
                    </small>
                  )}
                </div>

                <div className="col-md-3 mb-3">
                  <label className="form-label">Médico</label>

                  <select
                    className="form-select"
                    value={medicoId}
                    onChange={(e) => selecionarMedico(e.target.value)}
                  >
                    <option value="">Selecione um médico</option>

                    {medicos.map((medico) => (
                      <option key={medico.id} value={medico.id}>
                        {nomeMedico(medico)}
                      </option>
                    ))}
                  </select>

                  {medicos.length === 0 && (
                    <small className="text-muted">
                      Nenhum médico carregado.
                    </small>
                  )}
                </div>

                <div className="col-md-3 mb-3">
                  <label className="form-label">Especialidade</label>

                  <input
                    type="text"
                    className="form-control"
                    value={especialidade}
                    readOnly
                    placeholder="Será preenchida pelo médico"
                  />
                </div>

                <div className="col-md-3 mb-3">
                  <label className="form-label">Data desejada</label>

                  <input
                    type="date"
                    className="form-control"
                    value={dataDesejada}
                    onChange={(e) => setDataDesejada(e.target.value)}
                  />
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={carregando}
              >
                {carregando ? "Adicionando..." : "Adicionar à lista"}
              </button>
            </form>
          </div>
        </div>

        <div className="card">
          <div className="card-header">Pacientes na lista de espera</div>

          <div className="card-body table-responsive">
            <table className="table table-striped table-hover align-middle">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Paciente</th>
                  <th>Médico</th>
                  <th>Especialidade</th>
                  <th>Data desejada</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>

              <tbody>
                {lista.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center">
                      Nenhum paciente na lista de espera.
                    </td>
                  </tr>
                ) : (
                  lista.map((item) => (
                    <tr key={item.id}>
                      <td>{item.id}</td>

                      <td>
                        {item.paciente_nome || `Paciente #${item.paciente_id}`}
                      </td>

                      <td>{item.medico_nome || "Não informado"}</td>

                      <td>{item.especialidade || "Não informada"}</td>

                      <td>{formatarData(item.data_desejada)}</td>

                      <td>
                        <span className="badge bg-secondary">
                          {item.status}
                        </span>
                      </td>

                      <td>
                        <button
                          className="btn btn-sm btn-warning me-2"
                          onClick={() => alterarStatus(item.id, "chamar")}
                          disabled={item.status !== "ATIVO"}
                        >
                          Chamar
                        </button>

                        <button
                          className="btn btn-sm btn-success me-2"
                          onClick={() => alterarStatus(item.id, "encerrar")}
                          disabled={
                            item.status === "ENCERRADO" ||
                            item.status === "CANCELADO"
                          }
                        >
                          Encerrar
                        </button>

                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => alterarStatus(item.id, "cancelar")}
                          disabled={
                            item.status === "CANCELADO" ||
                            item.status === "ENCERRADO"
                          }
                        >
                          Cancelar
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

export default ListaEspera;