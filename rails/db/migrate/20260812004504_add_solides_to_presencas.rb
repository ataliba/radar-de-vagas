class AddSolidesToPresencas < ActiveRecord::Migration[8.1]
  def change
    add_column :presencas, :solides, :string
    add_column :presencas, :solides_vagas, :integer
  end
end
