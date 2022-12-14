import React from 'react';
import DatePicker, { registerLocale } from 'react-datepicker';
import ja from 'date-fns/locale/ja';
import Select, { components } from 'react-select';
import { connect } from 'react-redux';
import ModalWindow from './ModalWindow';
import SlackActions from '../actions/SlackActions';

import 'react-datepicker/dist/react-datepicker.css';
import './AdvancedSearchWindow.less';

const { Option } = components;
registerLocale('ja', ja);

const IconOption = props => (
  <Option {...props}>
    <img src={props.data.icon} style={{ width: 24, 'padding-right': '1em' }} />
    {props.data.label}
  </Option>
);
/**
 * Convert the date to TS format in slack.
 * If date is null, it returns '*'.
 * @param {Date|null} date
 * @returns string
 */
const calcTS = date => {
  if (!date) return '*';
  return (date.getTime() / 1000).toFixed(0);
};
class AdvancedSearchWindow extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      andQuery: '',
      orQuery: '',
      selectChannels: [],
      selectUsers: [],
      startDate: null,
      endDate: null,
    };
  }
  handleChangeAnd(event) {
    this.setState({andQuery: event.target.value});
  }
  handleChangeOr(event) {
    this.setState({orQuery: event.target.value});
  }
  handleChangeChannel(value) {
    this.setState({selectChannels: value});
  }
  handleChangeUser(value) {
    this.setState({selectUsers: value});
  }
  handleChangeStartDate(value) {
    this.setState({startDate: value});
  }
  handleChangeEndDate(value) {
    this.setState({endDate: value});
  }
  search(e) {
    e.preventDefault();
    const qAND = this.state.andQuery.split(' ').join(' AND ');
    const qOR = this.state.orQuery.split(' ').join(' OR ');
    const qCH = this.state.selectChannels.map(v=>`channel:${v.value}`).join(' OR ');
    const qUSER = this.state.selectUsers.map(v=>`user:${v.value}`).join(' OR ');
    const qDATE = `ts:[${calcTS(this.state.startDate)} TO ${calcTS(this.state.endDate)}]`;

    const query = [qAND, qOR, qCH, qUSER, qDATE].filter(v=>(v.length > 0)).map(v=>`(${v})`);
    this.props.updateSearchWord(query.join(' AND '));
    this.props.toggleAdvancedSearchWindow();
  }
  getChannelOptions() {
    return Object.entries(this.props.channels).map(([k, v]) => (
      {value: k, label: v.name}
    ));
  }
  getUserOptions() {
    return Object.entries(this.props.users).map(([k, v]) => (
      {value: k, label: `${v.name} (${v.profile.display_name})`, icon: v.profile.image_24}
    ));
  }
  render() {
    if (!this.props.visible) {
      return null;
    }
    return (
      <div>
        <ModalWindow
          toggleModalWindow={this.props.toggleAdvancedSearchWindow}
          title="Advanced Search"
        >
          <form id="advanced-search-form" onSubmit={this.search.bind(this)}>
            <div className="form-section">
              All of: <input type="text" name="and" value={this.state.andQuery} onChange={this.handleChangeAnd.bind(this)} />
            </div>
            <div className="form-section">
              Any of: <input type="text" name="or" value={this.state.orQuery} onChange={this.handleChangeOr.bind(this)} />
            </div>
            <div className="form-section multiple-items">
              <div className="form-item">
                from: <DatePicker
                  locale="ja"
                  selected={this.state.startDate}
                  onChange={this.handleChangeStartDate.bind(this)}
                  dateFormat="yyyy/MM/dd HH:mm"
                  showTimeSelect
                />
              </div>
              <div className="form-item">
                until: <DatePicker
                  locale="ja"
                  selected={this.state.endDate}
                  onChange={this.handleChangeEndDate.bind(this)}
                  dateFormat="yyyy/MM/dd HH:mm"
                  showTimeSelect
                />
              </div>
            </div>
            <div className="form-section">
              Channel:<Select
                isMulti
                onChange={this.handleChangeChannel.bind(this)}
                options={this.getChannelOptions()}
                value={this.state.selectChannels}
              />
            </div>
            <div className="form-section">
              User:<Select
                isMulti
                onChange={this.handleChangeUser.bind(this)}
                options={this.getUserOptions()}
                value={this.state.selectUsers}
                components={{
                  Option: IconOption,
                }}
              />
            </div>
            <div className="form-section">
              <input type="submit" value="Search" />
            </div>
          </form>
        </ModalWindow>
      </div>
    )
  }
}

const mapStateToProps = state => {
  return {
    channels: state.channels.channels,
    users: state.users,
  };
};
const mapDispatchToProps = dispatch => {
  return {
    updateSearchWord: (query) => {
      dispatch(SlackActions.updateSearchWord(query));
    }
  };
};
export default connect(mapStateToProps, mapDispatchToProps)(AdvancedSearchWindow);