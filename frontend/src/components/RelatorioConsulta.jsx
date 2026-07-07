import React from "react";

function RelatorioConsulta({ consulta }) {
  return (
    <div
      id="relatorio-consulta"
      style={{
        padding: "30px",
        backgroundColor: "#fff",
        color: "#000",
        width: "800px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <h2 style={{ textAlign: "center", marginBottom: "30px" }}>
        RELATÓRIO DE CONSULTA
      </h2>

      <p>
        <strong>Paciente:</strong>{" "}
        {consulta?.paciente_nome || consulta?.paciente || "Não informado"}
      </p>

      <p>
        <strong>Médico:</strong>{" "}
        {consulta?.medico_nome || consulta?.medico || "Não informado"}
      </p>

      <p>
        <strong>Data da consulta:</strong>{" "}
        {consulta?.data_consulta || consulta?.data || "Não informada"}
      </p>

      <p>
        <strong>Status:</strong> {consulta?.status || "Não informado"}
      </p>

      <hr />

      <h4>Observações do médico</h4>
      <p>
        {consulta?.observacoes ||
          consulta?.observacao ||
          "Nenhuma observação registrada."}
      </p>

      <hr />

      <h4>Prescrição</h4>
      <p>
        {consulta?.prescricao ||
          consulta?.medicamento ||
          "Nenhuma prescrição registrada."}
      </p>

      <hr />

      <h4>Exames solicitados</h4>
      <p>
        {consulta?.exames ||
          consulta?.exame ||
          "Nenhum exame solicitado."}
      </p>

      <br />

      <p style={{ fontSize: "12px", textAlign: "center" }}>
        Documento gerado pelo sistema Clinical Med.
      </p>
    </div>
  );
}

export default RelatorioConsulta;