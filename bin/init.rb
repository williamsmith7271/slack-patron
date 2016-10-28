require 'yaml'
require 'optparse'
require 'securerandom'

# XXX using string hash key for backword compatibility...
config = {
  'slack' => {
    'token' => nil
  },
  'default_channel' => 'general',
  'database' => {
    'uri' => 'mongo:27017',
    'database' => 'slack_logger'
  },
  'redis' => {
    'url' => 'redis://redis:6379',
    'namespace' => 'sidekiq'
  },
  'rack' => {
    'secret' => SecureRandom.hex
  }
}

OptionParser.new do |opts|
  opts.on('--token ARG', "Specify the access token") do |v|
    config['slack']['token'] = v
  end

  opts.on('-h', '--help', 'Display this help') do
    puts opts
    exit
  end
end.parse!

if config['slack']['token'].nil? || config['slack']['token'] == ''
  puts "Get access token from https://slack-patron.herokuapp.com/"
  raise OptionParser::MissingArgument
end

File.open('config.yml', 'w') do |f|
  f.write(config.to_yaml)
end

puts "Done!"
puts "Edit config.yml for more configuration"
