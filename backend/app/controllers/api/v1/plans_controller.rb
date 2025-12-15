class Api::V1::PlansController < Api::V1::ApplicationController
  before_action :authenticate_api_v1_user!
  
  # GET /api/v1/plans
  def index
    @plans = Plan.all.order(:amount)
    render json: Api::V1::PlanSerializer.render(@plans)
  end
  
  # GET /api/v1/plans/:id
  def show
    @plan = Plan.find(params[:id])
    render json: Api::V1::PlanSerializer.render(@plan)
  end
end

