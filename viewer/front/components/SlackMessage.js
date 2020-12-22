import React, { Component } from 'react';
import ChannelName from './ChannelName';
import { Link } from 'react-router-dom';
import { EmojiData } from 'emoji-data-ts';
import MessagesType from '../constants/MessagesType';
import MrkdwnText from './message/MrkdwnText';
import find from 'lodash/find';

const emojiData = new EmojiData();

export default class extends Component {
  getChannel(id) {
    const channels = this.props.channels;
    const ims = this.props.ims;
    if (channels && channels[id]) {
      return channels[id];
    }
    if (ims && ims[id]) {
      return ims[id];
    }
  }
  getUser(id) {
    const users = this.props.users;
    return users && users[id];
  }
  getEmojiImage(name) {
    const data = emojiData.getImageData(name);
    if (data) {
      return `https://cdn.jsdelivr.net/gh/iamcal/emoji-data@v4.1.0/img-apple-64/${data.imageUrl}`
    }
    const emojis = this.props.emojis;
    const emoji = emojis && emojis[name];
    if (emoji && emoji.startsWith('alias:')) {
      return this.getEmojiImage(emoji.split(':')[1]);
    }
    return emoji;
  }
  formatDate(date) {
    return new Date(date * 1000).toLocaleString();
  }
  messageLink(message) {
    return `/${message.channel}/${message.ts}`;
  }
  threadLink(message) {
    return `/thread/${message.thread_ts}?ts=${encodeURIComponent(message.ts)}`;
  }
  originalMessageLink(teamInfo, message) {
    const messageId = message.ts.replace('.', '');
    return `https://${teamInfo.domain}.slack.com/messages/${message.channel}/p${messageId}`;
  }
  renderReaction(reaction) {
    return (
      <div className="slack-message-reaction" key={reaction.name}>
        {
          this.getEmojiImage(reaction.name) ? (
            <img className="slack-message-reaction-image" src={this.getEmojiImage(reaction.name)} />
          ) : (
            `:${reaction.name}:`
          )
        }
        <div className="slack-message-reaction-count">{reaction.count}</div>
      </div>);
  }
  render() {
    const SlackMessagePrototype = ({ message, icon, username, showChannel, teamInfo, text }) => {
      const channel = this.getChannel(message.channel);
      const classNames = ['slack-message'];
      if (this.props.selected) {
        classNames.push('selected');
      }

      return (
        <div className={ classNames.join(' ') } ref={this.props.messageRef}>
          <div className="slack-message-user-image">
            <img src={icon} />
          </div>
          <div className="slack-message-content">
            <div className="slack-message-head">
              <div className="slack-message-user-name">{username}</div>
              <div className="slack-message-date">
                <Link to={this.messageLink(message)}>
                  {this.formatDate(message.ts)}
                </Link>
              </div>
              { showChannel && channel ? (
                  <div className="slack-message-channel">
                    <Link to={ `/${channel.id}` }>
                      <ChannelName channel={channel} />
                    </Link>
                  </div>
                ) : null }
              <div className="slack-original-message-link">
                <a href={this.originalMessageLink(teamInfo, message)} target="_blank">open original</a>
              </div>
              { message.thread_ts && this.props.type !== MessagesType.THREAD_MESSAGES && (
                <div className="slack-message-thread">
                  <Link to={this.threadLink(message)}>
                    view thread
                  </Link>
                </div> ) }
            </div>
            <div className="slack-message-text">
              <MrkdwnText text={text} />
            </div>
            { message.reactions && message.reactions.length > 0 && (
              <div className="slack-message-reactions">{
                message.reactions.map((reaction) => this.renderReaction(reaction))
              }</div> ) }
          </div>
        </div>
      );
    };
    const botMessage = (teamInfo, message, showChannel) => {
      const attachment = find(message.attachments, (attachment) => attachment.text);
      const text = (!message.text && attachment) ? attachment.text : message.text;
      const icon = message.icons ? message.icons.image_48 : (attachment ? attachment.author_icon : '');
      return <SlackMessagePrototype
          message={message}
          icon={icon}
          username={message.username}
          showChannel={showChannel}
          teamInfo={teamInfo}
          text={text}
        />
    };
    const normalMessage = (teamInfo, message, user, showChannel) => {
      return <SlackMessagePrototype
          message={message}
          icon={user && user.profile.image_48}
          username={user && (user.profile.display_name || user.profile.real_name || user.name)}
          showChannel={showChannel}
          teamInfo={teamInfo}
          text={message.text}
        />
    };

    if (this.props.message.hidden) {
      return null;
    }

    const message = this.props.message;
    const showChannel = this.props.type === MessagesType.SEARCH_MESSAGES;
    switch (this.props.message.subtype) {
      case 'bot_message': { 
        return botMessage(this.props.teamInfo, message, showChannel);
      }
      default: {
        return normalMessage(this.props.teamInfo, message, this.getUser(message.user), showChannel);
      }
    }
  }
}
