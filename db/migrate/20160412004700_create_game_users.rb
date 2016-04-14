class CreateGameUsers < ActiveRecord::Migration
  def change
    create_table :game_users do |t|
      t.references :game, index: true, foreign_key: true
      t.references :user, index: true, foreign_key: true
      t.string :dice

      t.timestamps null: false
    end
  end
end