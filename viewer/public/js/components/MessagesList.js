import React from 'react';
import { connect } from 'react-redux'
import $ from 'jquery';
import SlackMessage from './SlackMessage';

class MessagesList extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      isLoadingMore: false,
      oldHeight: 0
    };
  }
  scrollToLastMessage() {
    $(this.refs.messagesList).scrollTop(this.currentHeight());
  }
  currentHeight() {
    return this.refs.messagesList.scrollHeight;
  }
  handleLoadMore() {
    if (this.state.isLoadingMore) {
      return;
    }

    this.setState({
      isLoadingMore: true,
      oldHeight: this.currentHeight()
    });

    let minTs = (this.state.messages.length > 0) && this.state.messages[0].ts;
    this.props.onLoadMoreMessages(minTs);
  }
  componentDidMount() {
    this.scrollToLastMessage();
  }
  componentDidUpdate() {
    if (this.scrollAfterUpdate) {
      this.scrollToLastMessage();
      this.scrollAfterUpdate = false;
    }
  }
  componentWillReceiveProps(nextProps) {
    if (this.state.isLoadingMore) {
      // fix scrollTop when load more messages
      $(this.refs.messagesList).scrollTop(
        this.currentHeight() - this.state.oldHeight
      );
      this.setState({ isLoadingMore: false });
    }
    if (nextProps.messagesInfo !== this.props.messagesInfo) {
      this.scrollAfterUpdate = true;
    }
  }
  render() {
    const createMessages = (messages) => messages.map(message => (
        <SlackMessage message={message} users={this.props.users}
          teamInfo={this.props.teamInfo}
          channels={this.props.channels}
          ims={this.props.ims}
          key={message.ts}
          type={this.props.messagesInfo.type} />
      ));
    const loadMoreSection = () => {
      if (!this.props.hasMoreMessage) {
        return;
      }

      if (this.state.isLoadingMore) {
        return <div className="messages-load-more loading">Loading...</div>;
      } else {
        return (
          <div className="messages-load-more" onClick={this.handleLoadMore}>
            Load more messages...
          </div>
        );
      }
    };

    return (
      <div className="messages-list" ref="messagesList">
        {loadMoreSection()}
        {createMessages(this.props.messages)}
      </div>
    );
  }
}

const mapStateToProps = state => {
  return {
    messages: state.messages.messages,
    hasMoreMessage: state.messages.hasMoreMessage,
    messagesInfo: state.messages.messagesInfo,
    users: state.users,
    channels: state.channels,
    ims: state.ims,
    teamInfo: state.teamInfo
  };
};

export default connect(mapStateToProps)(MessagesList);
