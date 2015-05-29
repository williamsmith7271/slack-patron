import React from 'react';

export default React.createClass({
  formatDate(date) {
    return new Date(date * 1000).toLocaleString();
  },
  formatText(text) {
    let channelLink = (id) => `#${this.props.channels[id].name}`;
    let userLink = (id) => `@${this.props.users[id].name}`;
    let specialCommand = (command) => `@${command}`;
    if (text) {
      return text.replace(/<#([0-9A-Za-z]+)>/, (m, id) => channelLink(id))
        .replace(/<#([0-9A-Za-z]+)\|([0-9A-Za-z]+)>/gi, (m, id) => channelLink(id))
        .replace(/<@([0-9A-Za-z]+)>/, (m, id) => userLink(id))
        .replace(/<@([0-9A-Za-z]+)\|([0-9A-Za-z]+)>/gi, (m, id) => userLink(id))
        .replace(/<!(channel|everyone|group)>/gi, (m, command) => specialCommand(command));
    }
    return text;
  },
  render() {
    let user = this.props.users[this.props.message.user];
    return (
      <div className="slack-message">
        <div className="slack-message-user-image">
          <img src={user && user.profile.image_32} />
        </div>
        <div className="slack-message-content">
          <div className="slack-message-user-name">{user && user.name}</div>
          <div className="slack-message-date">{this.formatDate(this.props.message.ts)}</div>
          <div className="slack-message-text">{this.formatText(this.props.message.text)}</div>
        </div>
      </div>
    );
  }
});
