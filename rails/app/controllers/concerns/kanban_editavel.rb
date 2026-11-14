# Com JobSync configurado o Kanban interno é somente leitura (issue #48) — a
# gestão das vagas escolhidas acontece lá. Bloqueia no servidor também, não
# só escondendo os botões.
module KanbanEditavel
  extend ActiveSupport::Concern

  private

  def exigir_kanban_editavel
    return unless modo_jobsync?

    respond_to do |format|
      format.html { redirect_to kanban_path, alert: "Kanban somente leitura: as vagas são gerenciadas no JobSync." }
      format.json { render json: { erro: "Kanban somente leitura (JobSync configurado)." }, status: :forbidden }
    end
  end
end
