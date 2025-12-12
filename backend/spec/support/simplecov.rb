# SimpleCov must be required before any application code is loaded
if ENV['COVERAGE']
  require 'simplecov'
  
  SimpleCov.start 'rails' do
    # Exclude test files and configuration
    add_filter '/spec/'
    add_filter '/config/'
    add_filter '/vendor/'
    
    # Track different groups
    add_group 'Models', 'app/models'
    add_group 'Controllers', 'app/controllers'
    add_group 'Jobs', 'app/jobs'
    add_group 'Services', 'app/services'
    add_group 'Helpers', 'app/helpers'
    
    # Minimum coverage threshold (optional)
    minimum_coverage 80
  end
end

