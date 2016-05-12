class GamesController < ApplicationController
  before_action :set_game, only: [:show, :edit, :update, 
    :destroy, :bid, :challenge]

  # GET /games
  # GET /games.json
  def index
    @games = Game.all
  end

  # GET /games/1
  # GET /games/1.json
  def show
    session[:game_id] = @game.id
    session[:game_name] = @game.name
  end

  # GET /games/new
  def new
    @game = Game.new
  end

  # GET /games/1/edit
  def edit
  end

  # POST /games
  # POST /games.json
  def create
    @game = Game.new(game_params)
    session[:game_id] = @game.id
    session[:game_name] = @game.name
    respond_to do |format|
      if @game.save
        format.html { redirect_to @game }
        format.json { render :show, status: :created, location: @game }
      else
        format.html { render :new }
        format.json { render json: @game.errors, status: :unprocessable_entity }
      end
    end
  end

  # PATCH/PUT /games/1
  # PATCH/PUT /games/1.json
  def update
    Pusher.trigger('game_channel'+session[:game_id].to_s, 'render_game_start', game_params)
    respond_to do |format|
      if @game.update(game_params)
        format.html { redirect_to @game, notice: 'Game was successfully updated.' }
        format.json { render :show, status: :ok, location: @game }
      else
        format.html { render :edit }
        format.json { render json: @game.errors, status: :unprocessable_entity }
      end
    end
  end

  # DELETE /games/1
  # DELETE /games/1.json
  def destroy
    @game.destroy
    respond_to do |format|
      format.html { redirect_to games_url, notice: 'Game was successfully destroyed.' }
      format.json { head :no_content }
    end
  end

  #Save bid into the database
  #Check if bid is valid
  #If valid, save
  #If not, return with prompt
  def bid

    puts game_params[:quantity]
    if game_params[:quantity].to_i > @game.quantity.to_i || 
      game_params[:value].to_i > @game.value.to_i
      @game.update(game_params)
      Pusher.trigger('game_channel'+@game.id.to_s, 'bid_event', game_params)
      head :ok
    else
      respond_to do |format|
        test = {:status => "ok", :bad_response => "You did not bid higher"}
        format.json {render :json => test}
      end
    end
  end

  #Handle challenge
  #Check if bid is in the diepool
  #Use pusher to display results to everyone.
  def challenge
    return_data = {:diepool => @game.diepool}
    temp_quantity = 0
    @game.diepool.split(",").map do |str|
      str.to_i
    end.each do |die|
      temp_quantity += 1 if @game.value == die
    end

    return_data[:result] = temp_quantity == @game.quantity ? true : false

    Pusher.trigger('game_channel'+@game.id.to_s, 'challenge_event', return_data)
    head :ok
    # respond_to do |format|
    #   format.json {render :json => return_data}
    # end
  end

  def lose_dice
  end

  def deal_dice
  end

  private
    # Use callbacks to share common setup or constraints between actions.
    def set_game
      @game = Game.find(params[:id])
    end

    # Never trust parameters from the scary internet, only allow the white list through.
    def game_params
      params.require(:game).permit(:name, :turn, :max_users, :logged_in_users,
       :diepool, :state, :quantity, :value)
    end
end
