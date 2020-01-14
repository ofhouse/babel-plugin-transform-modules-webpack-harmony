import { transform as babelTransform } from '@babel/core';
import { wrap } from 'jest-snapshot-serializer-raw';

import plugin from '../babel-plugin-transform-modules-webpack-harmony';

function transform(input, options = {}) {
  return wrap(
    babelTransform(input, {
      babelrc: false,
      configFile: false,
      plugins: [[plugin, options]],
    }).code
  );
}

describe('plugin-transform-modules-webpack-harmony', () => {
  test('default export: transformed JSX code', () => {
    expect(
      transform(`
      import React from "react";
      import { Blocks, HeaderBasic, HeaderLogo } from "@blocks/react";

      export default (() =>
      React.createElement(Blocks.Root, null,
      React.createElement(HeaderLogo, null,
      React.createElement(HeaderLogo.Logo, { to: "/" }),
      React.createElement(HeaderLogo.Nav, null,
      React.createElement(HeaderLogo.Link, { to: "/about" }, "About"),
      React.createElement(HeaderLogo.Link, { to: "/blog" }, "Blog"),
      React.createElement(HeaderLogo.Link, { to: "/contact" }, "Contact"))),


      React.createElement(HeaderBasic, null,
      React.createElement(HeaderBasic.Logo, { to: "/" }, "Hello"),
      React.createElement(HeaderBasic.Nav, null,
      React.createElement(HeaderBasic.Link, { to: "/about" }, "About"),
      React.createElement(HeaderBasic.Link, { to: "/blog" }, "Blog"),
      React.createElement(HeaderBasic.Link, { to: "/contact" }, "Contact")))));
    `)
    ).toMatchSnapshot();
  });
});
