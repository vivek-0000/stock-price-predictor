// src/services/api.js
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://3.106.166.28:8000';

const api = axios.create({ baseURL: API_BASE, timeout: 120000 });

export const stockAPI = {
  health:          ()                               => api.get('/health'),
  forecast:        (ticker, model = 'both')         => api.get('/forecast',         { params: { ticker, model } }),
  monthlyForecast: (ticker, days = 30, model = 'both') => api.get('/forecast/monthly', { params: { ticker, days, model } }),
  predict:         (ticker, model = 'tensorflow')   => api.get('/predict',           { params: { ticker, model } }),
  indicators:      (ticker, start = '2020-01-01')   => api.get('/indicators',        { params: { ticker, start } }),
  compare:         (ticker)                         => api.get('/compare',           { params: { ticker } }),
};
