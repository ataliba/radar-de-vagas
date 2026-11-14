class KanbanColuna < ApplicationRecord
  # Colunas que o candidato recebe pronto (issue #48): [nome, encerra o processo?].
  # Mesma lista da migration CreateKanban, que semeia bancos já existentes; em
  # instalação nova o db:prepare carrega o schema.rb e roda o db/seeds.rb.
  PADRAO = [
    [ "Aplicado", false ],
    [ "Entrevista", false ],
    [ "Entrevista técnica", false ],
    [ "Proposta", false ],
    [ "Aceito", true ],
    [ "Rejeitado", true ],
    [ "Desistiu", true ]
  ].freeze

  has_many :vagas, dependent: :nullify

  validates :nome, presence: true, length: { maximum: 60 }

  before_validation { self.nome = nome&.strip }
  before_validation(on: :create) { self.posicao ||= (KanbanColuna.maximum(:posicao) || -1) + 1 }

  scope :ordenadas, -> { order(:posicao, :id) }

  def self.criar_padrao!
    PADRAO.each_with_index { |(nome, encerra), i| create!(nome: nome, encerra: encerra, posicao: i) }
  end

  def self.primeira
    ordenadas.first
  end

  # Troca de lugar com a coluna vizinha (direcao: -1 = esquerda, 1 = direita).
  # Renumera todas pra corrigir buracos/empates em `posicao` de quebra.
  def mover!(direcao)
    colunas = KanbanColuna.ordenadas.to_a
    indice = colunas.index(self)
    alvo = indice && indice + direcao
    return false if alvo.nil? || alvo.negative? || alvo >= colunas.size

    colunas[indice], colunas[alvo] = colunas[alvo], colunas[indice]
    transaction do
      colunas.each_with_index { |c, pos| KanbanColuna.where(id: c.id).update_all(posicao: pos) }
    end
    true
  end

  # Apaga a coluna levando os cards pra `destino` (com evento no histórico de
  # cada vaga). Coluna com cards e sem destino válido não é apagada.
  def apagar_movendo_para!(destino)
    tem_cards = vagas.exists?
    return false if tem_cards && (destino.nil? || destino == self)

    transaction do
      vagas.find_each { |vaga| vaga.mover_para!(destino) } if tem_cards
      destroy!
    end
    true
  end
end
