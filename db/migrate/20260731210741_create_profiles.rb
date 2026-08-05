class CreateProfiles < ActiveRecord::Migration[8.1]
  def change
    create_table :profiles do |t|
      t.text :markdown_content
      t.string :content_hash

      t.timestamps
    end
  end
end
