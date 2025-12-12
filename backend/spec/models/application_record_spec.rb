require 'rails_helper'

RSpec.describe ApplicationRecord, type: :model do
  # This is a placeholder spec to verify RSpec is working
  # Replace with actual model specs as you add models

  describe 'class methods' do
    it 'is an abstract class' do
      expect(ApplicationRecord.abstract_class).to be true
    end
  end
end

