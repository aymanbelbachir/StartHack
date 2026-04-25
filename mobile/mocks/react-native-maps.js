// Web stub — react-native-maps has no web support
const { View, Text } = require('react-native');
const React = require('react');

const MapView = React.forwardRef(({ style, children }, _ref) =>
  React.createElement(View, {
    style: [{ backgroundColor: '#D1D5DB', alignItems: 'center', justifyContent: 'center' }, style],
  },
    React.createElement(Text, { style: { color: '#6B7280', fontSize: 13 } }, 'Map (mobile only)'),
    children,
  )
);
MapView.displayName = 'MapView';

const Marker = ({ children }) => children ?? null;
const PROVIDER_DEFAULT = null;
const PROVIDER_GOOGLE = 'google';

module.exports = MapView;
module.exports.default = MapView;
module.exports.Marker = Marker;
module.exports.PROVIDER_DEFAULT = PROVIDER_DEFAULT;
module.exports.PROVIDER_GOOGLE = PROVIDER_GOOGLE;
