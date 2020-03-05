require 'sinatra'
require 'net/http'
require 'json'
require './lib/slack_import'
require './lib/slack'
require './lib/db'

config = YAML.load_file('./config.yml')

configure do
  set :absolute_redirects, false
  set :prefixed_redirects, true
end

def users
  hashed_users = {}
  Users.find.each do |u|
    hashed_users[u[:id]] = u
  end
  hashed_users
end

def channels
  hashed_channels = {}
  Channels.find.sort(name: 1).each do |c|
    hashed_channels[c[:id]] = c
  end
  hashed_channels
end

def ims
  hashed_users = users
  hashed_ims = {}
  Ims.find.each do |c|
    hashed_ims[c[:id]] = c
    hashed_ims[c[:id]][:name] = hashed_users[c[:user]][:name]
  end
  hashed_ims.sort_by {|k, v| v[:name] }.to_h
end

def messages(params)
  limit = params[:limit] || 100
  ts_direction = params[:min_ts].nil? ? -1 : 1
  condition = {
    hidden: { '$ne' => true }
  }
  condition[:ts] = { '$gte' => params[:min_ts] } unless params[:min_ts].nil?
  condition[:ts] = { '$lte' => params[:max_ts] } unless params[:max_ts].nil?
  condition[:channel] = params[:channel] unless params[:channel].nil?
  condition['$or'] = [
    # normal message
    { text: Regexp.new(params[:search]) },
    # bot message
    {
      attachments: {
        '$elemMatch' => { text: Regexp.new(params[:search]) }
      },
      subtype: 'bot_message'
    }
  ] unless params[:search].nil?

  all_messages = Messages
    .find(condition)
    .sort(ts: ts_direction)
  has_more_message = all_messages.count({limit: limit+1}) > limit
  return_messages = all_messages.limit(limit).to_a
  return_messages = return_messages.reverse if ts_direction == -1

  return return_messages, has_more_message
end

def search(params)
  limit = params[:limit] || 100
  ts_direction = params[:min_ts].nil? ? "desc" : "asc"
  ts_range = { gte: 0 }
  ts_range = { gte: params[:min_ts] } unless params[:min_ts].nil?
  ts_range = { lte: params[:max_ts] } unless params[:max_ts].nil?

  uri = URI.parse("http://elasticsearch:9200/slack_logger/messages/_search")
  http = Net::HTTP.new(uri.host, uri.port)
  headers = { "Content-Type" => "application/json" }
  query = {
    query: {
      bool: {
        must: [
          {
            match: { text: params[:search].gsub("　", " ") }
	  },
	  {
            range: {
              ts: ts_range
            }
	  }
        ]
      }
    },
    size: limit,
    sort: [
      { ts: ts_direction }
    ],
    highlight: {
      fields: { text: {} }
    }
  }
  req = Net::HTTP::Post.new(uri.path)
  req.initialize_http_header(headers)
  req.body = query.to_json

  begin
    res = http.request(req)
    if res.is_a?(Net::HTTPSuccess)
      res_data = JSON.parse(res.body)
      all_messages = res_data['hits']['hits'].map do |entry|
        message = entry["_source"]
        message['_id'] = { '$oid' => entry['_id'] }
        message['text'] = entry['highlight']['text'][0]
        message
      end
      all_messages = all_messages.reverse if ts_direction == "desc"
      return all_messages, res_data['hits']['total'] > limit, [res_data, req.body]
    else
      return [], false, res.body
    end
  rescue => e
    return [], false, [e.class, e].join(" : ")
  end
end

get '/users.json' do
  content_type :json
  users.to_json
end

get '/channels.json' do
  content_type :json
  channels.to_json
end

get '/ims.json' do
  content_type :json
  ims.to_json
end

post '/messages/:channel.json' do
  all_messages, has_more_message = messages(
    channel: params[:channel],
    max_ts: params[:max_ts],
    min_ts: params[:min_ts]
  )
  all_messages = all_messages.select { |m| m[:ts] != params[:max_ts] && m[:ts] != params[:min_ts] }

  content_type :json
  {
    messages: all_messages,
    has_more_message: has_more_message
  }.to_json
end

post '/around_messages/:channel.json' do
  past_messages, has_more_past_message = messages(
    channel: params[:channel],
    max_ts: params[:ts],
    limit: 50
  )
  future_messages, has_more_future_message = messages(
    channel: params[:channel],
    min_ts: params[:ts],
    limit: 50
  )
  all_messages = (past_messages + future_messages).uniq { |m| m[:ts] }

  content_type :json
  {
    messages: all_messages,
    has_more_past_message: has_more_past_message,
    has_more_future_message: has_more_future_message
  }.to_json
end

get '/team.json' do
  content_type :json
  # TODO: cache in redis or mongodb or in memory?
  Slack.team_info['team'].to_json
end

post '/import_backup' do
  exported_file = '/tmp/slack_export.zip'
  FileUtils.move(params[:file][:tempfile], exported_file)
  # TODO: show progress when import
  SlackImport.new.import_from_file(exported_file)

  { result: 'success' }.to_json
end

get '/' do
  hashed_channels = channels
  default_channel, _ = hashed_channels.find do |id, channel|
    channel[:name] == config['default_channel']
  end
  if default_channel.nil?
    default_channel, _ = hashed_channels.first
  end
  redirect("/#{default_channel || 'CHANNELS_NOT_FOUND'}")
end

get '/:channel' do
  erb :index
end
get '/:channel/:ts' do
  erb :index
end
get '/search/:search_word' do
  erb :index
end

post '/search' do
  all_messages, has_more_message, debug = search(
    search: params[:word],
    max_ts: params[:max_ts],
    min_ts: params[:min_ts]
  )
  all_messages = all_messages.select { |m| m['ts'] != params[:max_ts] && m['ts'] != params[:min_ts] }
  content_type :json
  {
    messages: all_messages,
    has_more_message: has_more_message,
    debug: debug
  }.to_json
end
