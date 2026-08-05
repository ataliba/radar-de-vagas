class CreatePresencas < ActiveRecord::Migration[8.1]
  def change
    create_table :presencas do |t|
      t.string :empresa
      t.string :gupy
      t.string :gupy_url
      t.string :inhire
      t.string :inhire_url
      t.integer :inhire_vagas_total

      t.timestamps
    end

    add_index :presencas, :empresa, unique: true
  end
end
