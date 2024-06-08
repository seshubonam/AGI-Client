import React from 'react';
import PropTypes from 'prop-types';

function RawIcon({
  neonColor = false,
  color = null,
  size = 'normal',
  src,
  isImage = false,
  fa = null,
  className = null,
}) {
  const style = {};
  if (!fa) {
    if (color !== null) style.backgroundColor = color;
    if (isImage) {
      style.backgroundColor = 'transparent';
      style.backgroundImage = `url("${src}")`;
    } else {
      style.WebkitMaskImage = `url("${src}")`;
      style.maskImage = `url("${src}")`;
    }

    return (
      <span
        className={`ic-base ic-raw ic-raw-${size}${className ? ` ${className}` : ''}`}
        style={style}
      />
    );
  }

  if (color !== null) style.color = color;
  return (
    <i
      className={`ic-base ic-fa ic-fa-${size} ${fa}${className ? ` ${className}` : ''}`}
      style={style}
    />
  );
}

RawIcon.propTypes = {
  neonColor: PropTypes.bool,
  className: PropTypes.string,
  fa: PropTypes.string,
  color: PropTypes.string,
  size: PropTypes.oneOf(['large', 'normal', 'small', 'extra-small']),
  src: PropTypes.string,
  isImage: PropTypes.bool,
};

export default RawIcon;
