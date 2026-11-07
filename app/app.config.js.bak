const base = require('./app.json');

module.exports = () => {
  const api = process.env.EXPO_PUBLIC_API_URL || '';
  const allowCleartext = !/^https:\/\//i.test(api);

  const plugins = (base.expo.plugins || []).map((p) => {
    if (Array.isArray(p) && p[0] === 'expo-build-properties') {
      return [p[0], { ...p[1], android: { ...p[1].android, usesCleartextTraffic: allowCleartext } }];
    }
    return p;
  });
  return { ...base.expo, plugins };
};
