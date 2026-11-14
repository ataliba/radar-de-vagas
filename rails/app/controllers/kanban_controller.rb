class KanbanController < ApplicationController
  def show
    @colunas = KanbanColuna.ordenadas.to_a
    @vagas_por_coluna = Vaga.no_kanban
      .includes(:eventos)
      .order(updated_at: :desc)
      .group_by(&:kanban_coluna_id)

    # Modo JobSync: o que foi enviado pra lá aparece numa coluna própria, só
    # pra consulta — o andamento real é acompanhado no JobSync.
    @vagas_jobsync = modo_jobsync? ? Vaga.where(status: "enviada").order(enviado_em: :desc) : []
  end
end
