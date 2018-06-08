import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import {
  camelizeKeys,
  decamelizeKeys,
} from 'humps';
import {
  map,
  has,
  merge,
  pick,
} from 'ramda';
import { STATUS_CODES } from 'http';

import Endpoint from './Endpoint';
import { Nullable } from 'types';

class API {
  private axios: AxiosInstance;
  // Endpoints passed will be registered here
  public $: any = {};

  constructor(baseUrl: string, endpoints: Endpoint[]) {
    this.axios = axios.create({
      baseURL: baseUrl,
      headers: { 'Content-Type': 'application/json' },
      withCredentials: true,
    });

    this.registerEndPoints(endpoints);
  }

  public intercept(
    type: 'request',
    onFulfilled: (value: AxiosRequestConfig) => AxiosRequestConfig | Promise<AxiosRequestConfig>,
    onRejected?: (error: any) => any,
  ): void;

  public intercept(
    type: 'response',
    onFulfilled: (value: AxiosResponse) => AxiosResponse | Promise<AxiosResponse>,
    onRejected?: (error: any) => any,
  ): void;

  public intercept(
    type: any,
    onFulfilled: any,
    onRejected?: any,
  ) {
    if (type === 'request') {
      this.axios.interceptors.request.use(
        onFulfilled,
        onRejected,
      );

      return;
    }

    this.axios.interceptors.response.use(
      onFulfilled,
      onRejected,
    );
  }

  addEndpoint(instance: Endpoint) {
    const groupName = instance.group();
    const endpointName = instance.name();

    // if we don't have yet this group, we created it as an empty object
    if (!has(groupName, this.$)) {
      this.$[groupName] = {};
    }

    if (has(endpointName, this.$[groupName])) {
      throw new Error(`Endpoint ${groupName}.${endpointName} already defined.`);
    }

    // register the endpoint and bind the instance the function call to this class,
    // so the http methods will be available there
    this.$[groupName][endpointName] = instance.call.bind(this);
  }

  registerEndPoints(endpoints: Endpoint[]) {
    map(this.addEndpoint, endpoints);
  }

  static parseResponseBody(response: AxiosResponse) {
    const contentType = response.headers['Content-Type'];

    if (contentType && contentType.indexOf('application/json') > -1) {
      return camelizeKeys(response.data);
    }

    return response.data;
  }

  request(
    {
      url,
      method,
      headers,
      data,
    }: AxiosRequestConfig,
    convertBodyToSnakeCase = false,
  ) {
    const options: AxiosRequestConfig = {
      url,
      method,
      headers,
    };

    if (data) {
      options.data = convertBodyToSnakeCase ? decamelizeKeys(data) : data;
    }

    return this.axios.request(options)
      .then(API.parseResponseBody);
  }

  // HTTP methods
  get = (options: AxiosRequestConfig) => this.request({ method: 'GET', ...options });
  delete = (options: AxiosRequestConfig) => this.request({ method: 'DELETE', ...options });

  post = (options: AxiosRequestConfig, data: any, convertBodyToSnakeCase: Nullable<boolean>) =>
    this.request({ method: 'POST', data, ...options }, !!convertBodyToSnakeCase);

  put = (options: AxiosRequestConfig, data: any, convertBodyToSnakeCase: Nullable<boolean>) =>
    this.request({ method: 'PUT', data, ...options }, !!convertBodyToSnakeCase);

  patch = (options: AxiosRequestConfig, data: any, convertBodyToSnakeCase: Nullable<boolean>) =>
    this.request({ method: 'PATCH', data, ...options }, !!convertBodyToSnakeCase);
}

export default API;