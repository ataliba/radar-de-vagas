class CreateVagas < ActiveRecord::Migration[8.1]
  def change
    create_table :vagas do |t|
      t.string :empresa
      t.string :plataforma
      t.string :na_lista
      t.string :cargo_categoria
      t.string :titulo_vaga
      t.string :tipo
      t.string :local
      t.string :link
      t.string :nome_na_plataforma
      t.datetime :publicado
      t.string :alerta
      t.date :detectado_em

      t.timestamps
    end

    add_index :vagas, :link, unique: true
    add_index :vagas, :plataforma
    add_index :vagas, :cargo_categoria
    add_index :vagas, :na_lista
  end
end
