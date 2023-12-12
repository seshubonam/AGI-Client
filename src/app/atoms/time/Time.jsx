import React from 'react';
import PropTypes from 'prop-types';

import { isInSameDay } from '../../../util/common';
import moment from '../../../util/libs/momentjs';

function Time({ timestamp, fullTime, className }) {
  const date = new Date(timestamp);

  const formattedFullTime = moment(date).format('DD MMMM YYYY, hh:mm A');
  let formattedDate = formattedFullTime;

  if (!fullTime) {
    const compareDate = new Date();
    const isToday = isInSameDay(date, compareDate);
    compareDate.setDate(compareDate.getDate() - 1);
    const isYesterday = isInSameDay(date, compareDate);

    formattedDate = moment(date).format(isToday || isYesterday ? 'hh:mm A' : 'DD/MM/YYYY');
    if (isYesterday) {
      formattedDate = `Yesterday, ${formattedDate}`;
    }
  }

  return (
    <time
      className={className}
      dateTime={date.toISOString()}
      title={formattedFullTime}
    >
      {formattedDate}
    </time>
  );
}

Time.defaultProps = {
  fullTime: false,
  className: '',
};

Time.propTypes = {
  className: PropTypes.string,
  timestamp: PropTypes.number.isRequired,
  fullTime: PropTypes.bool,
};

export default Time;
