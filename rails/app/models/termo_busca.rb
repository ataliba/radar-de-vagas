class TermoBusca < ApplicationRecord
  self.table_name = "termos_busca"

  PRESETS = %w[preset_devops preset_dados].freeze
  ORIGENS = PRESETS + [ "custom" ]

  before_validation { termo = self.termo&.strip; self.termo = termo if termo }

  validates :termo, presence: true
  validates :rotulo, presence: true
  validates :origem, inclusion: { in: ORIGENS }

  scope :ativo, -> { where(ativo: true) }
  scope :custom, -> { where(origem: "custom") }
end
