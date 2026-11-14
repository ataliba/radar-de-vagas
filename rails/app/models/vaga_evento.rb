class VagaEvento < ApplicationRecord
  TIPOS = %w[adicionada movida descontinuada reativada].freeze

  belongs_to :vaga

  validates :tipo, inclusion: { in: TIPOS }

  def descricao
    case tipo
    when "adicionada" then "adicionada ao Kanban em #{para_coluna}"
    when "movida" then "#{de_coluna} → #{para_coluna}"
    when "descontinuada" then "sumiu do portal (descontinuada)"
    when "reativada" then "voltou a aparecer no portal"
    end
  end
end
