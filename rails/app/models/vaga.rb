class Vaga < ApplicationRecord
  PLATAFORMAS = %w[Gupy InHire Solides].freeze

  # detectado/nao_aplicavel = triagem da lista. Depois de escolhida, a vaga vai
  # pro JobSync (enviada) ou pro Kanban interno (no_kanban), conforme o modo.
  STATUSES = %w[detectado enviada nao_aplicavel no_kanban].freeze

  belongs_to :kanban_coluna, optional: true
  has_many :eventos, -> { order(:created_at, :id) }, class_name: "VagaEvento", dependent: :delete_all

  validates :status, inclusion: { in: STATUSES }

  scope :buscar, ->(termo) {
    where("empresa ILIKE :t OR titulo_vaga ILIKE :t", t: "%#{termo}%")
  }
  scope :no_kanban, -> { where.not(kanban_coluna_id: nil) }

  def self.stats_gerais
    {
      total: count,
      na_lista: where(na_lista: "Sim").count,
      empresas: distinct.count(:empresa),
      enviadas: where(status: "enviada").count,
      no_kanban: no_kanban.count
    }
  end

  def no_kanban?
    kanban_coluna_id.present?
  end

  def descontinuada?
    descontinuada_em.present?
  end

  def adicionar_ao_kanban!(coluna)
    transaction do
      update!(kanban_coluna: coluna, status: "no_kanban")
      eventos.create!(tipo: "adicionada", para_coluna: coluna.nome)
    end
  end

  def mover_para!(coluna)
    return if kanban_coluna_id == coluna.id

    transaction do
      de = kanban_coluna&.nome
      update!(kanban_coluna: coluna)
      eventos.create!(tipo: "movida", de_coluna: de, para_coluna: coluna.nome)
    end
  end

  def marcar_descontinuada!
    return if descontinuada?

    transaction do
      update!(descontinuada_em: Time.current)
      eventos.create!(tipo: "descontinuada", de_coluna: kanban_coluna&.nome)
    end
  end

  def reativar!
    return unless descontinuada?

    transaction do
      update!(descontinuada_em: nil)
      eventos.create!(tipo: "reativada", de_coluna: kanban_coluna&.nome)
    end
  end
end
