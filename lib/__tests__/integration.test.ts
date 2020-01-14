import { transform as babelTransform } from '@babel/core';
import { wrap } from 'jest-snapshot-serializer-raw';
import reactPreset from '@babel/preset-react';

import plugin from '../babel-plugin-transform-modules-webpack-harmony';

function transform(input, options = {}) {
  return wrap(
    babelTransform(input, {
      babelrc: false,
      configFile: false,
      presets: [reactPreset],
      plugins: [[plugin, options]],
    }).code
  );
}

describe('plugin-transform-modules-webpack-harmony', () => {
  test('JSX code', () => {
    expect(
      transform(`
      import React from "react";
      import { Blocks, HeaderLogo, HeaderBasic } from "@blocks/react";
      export default () => (
        <Blocks.Root>
          <HeaderLogo>
            <HeaderLogo.Logo to="/" />
            <HeaderLogo.Nav>
              <HeaderLogo.Link to="/about">About</HeaderLogo.Link>
              <HeaderLogo.Link to="/blog">Blog</HeaderLogo.Link>
              <HeaderLogo.Link to="/contact">Contact</HeaderLogo.Link>
            </HeaderLogo.Nav>
          </HeaderLogo>
          <HeaderBasic>
            <HeaderBasic.Logo to="/">Hello</HeaderBasic.Logo>
            <HeaderBasic.Nav>
              <HeaderBasic.Link to="/about">About</HeaderBasic.Link>
              <HeaderBasic.Link to="/blog">Blog</HeaderBasic.Link>
              <HeaderBasic.Link to="/contact">Contact</HeaderBasic.Link>
            </HeaderBasic.Nav>
          </HeaderBasic>
        </Blocks.Root>
      );
    `)
    ).toMatchSnapshot();
  });
});
