class CreateKanban < ActiveRecord::Migration[8.1]
  # Colunas que o candidato recebe pronto no primeiro boot (issue #48). Pode
  # renomear, reordenar, apagar e criar outras pela tela do Kanban.
  COLUNAS_PADRAO = [
    [ "Aplicado", false ],
    [ "Entrevista", false ],
    [ "Entrevista técnica", false ],
    [ "Proposta", false ],
    [ "Aceito", true ],
    [ "Rejeitado", true ],
    [ "Desistiu", true ]
  ].freeze

  def up
    create_table :kanban_colunas do |t|
      t.string :nome, null: false
      t.integer :posicao, null: false
      t.boolean :encerra, null: false, default: false

      t.timestamps
    end

    add_reference :vagas, :kanban_coluna, foreign_key: { on_delete: :nullify }
    add_column :vagas, :descontinuada_em, :datetime

    # Guarda o nome das colunas (não o id) pra linha do tempo continuar
    # legível se a coluna for renomeada ou apagada depois.
    create_table :vaga_eventos do |t|
      t.references :vaga, null: false, foreign_key: { on_delete: :cascade }
      t.string :tipo, null: false
      t.string :de_coluna
      t.string :para_coluna

      t.datetime :created_at, null: false
    end

    seed_colunas_padrao
  end

  def down
    drop_table :vaga_eventos
    remove_column :vagas, :descontinuada_em
    remove_reference :vagas, :kanban_coluna, foreign_key: true
    drop_table :kanban_colunas
  end

  private

  def seed_colunas_padrao
    now = Time.current
    values = COLUNAS_PADRAO.each_with_index.map { |(nome, encerra), i|
      "(#{quote(nome)}, #{i}, #{quote(encerra)}, #{quote(now)}, #{quote(now)})"
    }.join(",\n")
    execute("INSERT INTO kanban_colunas (nome, posicao, encerra, created_at, updated_at) VALUES #{values}")
  end
end
