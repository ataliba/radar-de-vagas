class Vaga < ApplicationRecord
  PLATAFORMAS = %w[Gupy InHire Solides].freeze

  STATUSES = %w[detectado enviada nao_aplicavel].freeze

  validates :status, inclusion: { in: STATUSES }

  scope :buscar, ->(termo) {
    where("empresa ILIKE :t OR titulo_vaga ILIKE :t", t: "%#{termo}%")
  }

  def self.stats_gerais
    {
      total: count,
      na_lista: where(na_lista: "Sim").count,
      empresas: distinct.count(:empresa),
      enviadas: where(status: "enviada").count
    }
  end
end
