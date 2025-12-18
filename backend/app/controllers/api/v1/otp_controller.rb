module Api
  module V1
    class OtpController < ApplicationController
      before_action :authenticate_api_v1_user!, except: [ :verify_login ]

      # POST /api/v1/otp/enable
      def enable
        if current_api_v1_user.otp_enabled?
          render json: {
            status: {
              code: 422,
              message: "OTP is already enabled"
            }
          }, status: :unprocessable_entity
          return
        end

        current_api_v1_user.generate_otp_secret
        render json: {
          status: {
            code: 200,
            message: "OTP secret generated"
          },
          data: Api::V1::OtpSerializer.serialize(current_api_v1_user)
        }, status: :ok
      end

      # POST /api/v1/otp/verify
      def verify
        unless current_api_v1_user.otp_secret_key.present?
          render json: {
            status: {
              code: 422,
              message: "OTP secret not generated. Please enable OTP first."
            }
          }, status: :unprocessable_entity
          return
        end

        otp_code = params[:otp_code]
        unless otp_code.present?
          render json: {
            status: {
              code: 422,
              message: "OTP code is required"
            }
          }, status: :unprocessable_entity
          return
        end

        if current_api_v1_user.verify_otp(otp_code)
          current_api_v1_user.update(otp_enabled: true)
          backup_codes = current_api_v1_user.generate_backup_codes

          render json: {
            status: {
              code: 200,
              message: "2FA enabled successfully"
            },
            backup_codes: backup_codes
          }, status: :ok
        else
          render json: {
            status: {
              code: 422,
              message: "Invalid OTP code"
            }
          }, status: :unprocessable_entity
        end
      end

      # POST /api/v1/otp/disable
      def disable
        unless current_api_v1_user.otp_enabled?
          render json: {
            status: {
              code: 422,
              message: "OTP is not enabled"
            }
          }, status: :unprocessable_entity
          return
        end

        password = params[:password]
        otp_code = params[:otp_code]

        unless password.present? && otp_code.present?
          render json: {
            status: {
              code: 422,
              message: "Password and OTP code are required"
            }
          }, status: :unprocessable_entity
          return
        end

        # Verify password
        unless current_api_v1_user.valid_password?(password)
          render json: {
            status: {
              code: 401,
              message: "Invalid password"
            }
          }, status: :unauthorized
          return
        end

        # Verify OTP or backup code
        otp_valid = current_api_v1_user.verify_otp(otp_code) ||
                    current_api_v1_user.verify_backup_code(otp_code)

        unless otp_valid
          render json: {
            status: {
              code: 422,
              message: "Invalid OTP code or backup code"
            }
          }, status: :unprocessable_entity
          return
        end

        # Disable OTP
        current_api_v1_user.update(
          otp_enabled: false,
          otp_secret_key: nil,
          backup_codes: []
        )

        render json: {
          status: {
            code: 200,
            message: "2FA disabled successfully"
          }
        }, status: :ok
      end

      # POST /api/v1/otp/verify_login
      def verify_login
        user_id = params[:user_id]
        otp_code = params[:otp_code]

        unless user_id.present? && otp_code.present?
          render json: {
            status: {
              code: 422,
              message: "User ID and OTP code are required"
            }
          }, status: :unprocessable_entity
          return
        end

        user = User.find_by(id: user_id)
        unless user&.otp_enabled?
          render json: {
            status: {
              code: 422,
              message: "User not found or OTP not enabled"
            }
          }, status: :unprocessable_entity
          return
        end

        # Verify OTP or backup code
        otp_valid = user.verify_otp(otp_code) || user.verify_backup_code(otp_code)

        if otp_valid
          # Sign in the user and generate JWT token
          sign_in(:api_v1_user, user)
          
          # Generate JWT token manually for the response header
          token = Warden::JWTAuth::UserEncoder.new.call(user, :api_v1_user, nil).first
          response.set_header("Authorization", "Bearer #{token}")
          
          render json: {
            status: {
              code: 200,
              message: "Logged in successfully"
            },
            data: Api::V1::UserSerializer.serialize(user)
          }, status: :ok
        else
          render json: {
            status: {
              code: 401,
              message: "Invalid OTP code or backup code"
            }
          }, status: :unauthorized
        end
      end

      # POST /api/v1/otp/backup_codes
      def backup_codes
        unless current_api_v1_user.otp_enabled?
          render json: {
            status: {
              code: 422,
              message: "OTP is not enabled"
            }
          }, status: :unprocessable_entity
          return
        end

        password = params[:password]
        unless password.present?
          render json: {
            status: {
              code: 422,
              message: "Password is required"
            }
          }, status: :unprocessable_entity
          return
        end

        # Verify password
        unless current_api_v1_user.valid_password?(password)
          render json: {
            status: {
              code: 401,
              message: "Invalid password"
            }
          }, status: :unauthorized
          return
        end

        # Generate new backup codes
        backup_codes = current_api_v1_user.generate_backup_codes

        render json: {
          status: {
            code: 200,
            message: "Backup codes generated successfully"
          },
          backup_codes: backup_codes
        }, status: :ok
      end

      # GET /api/v1/otp/qr_code
      def qr_code
        unless current_api_v1_user.otp_secret_key.present?
          render json: {
            status: {
              code: 422,
              message: "OTP secret not generated. Please enable OTP first."
            }
          }, status: :unprocessable_entity
          return
        end

        render json: {
          status: {
            code: 200,
            message: "QR code retrieved successfully"
          },
          qr_code: current_api_v1_user.qr_code_data_url,
          provisioning_uri: current_api_v1_user.provisioning_uri
        }, status: :ok
      end
    end
  end
end
