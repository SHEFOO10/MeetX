import js from '@eslint/js';
// import react from 'eslint-plugin-react';  // Commented out since React is not yet installed

export default [
  {
    files: ['**/*.js', '**/*.jsx'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        console: 'readonly',
        require: 'readonly',
        module: 'readonly',
        __dirname: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
      },
    },
    // plugins: {
    //   react,  // Commented out since React is not yet installed
    // },
    // settings: {
    //   react: {
    //     version: 'detect',
    //   },
    // },
    rules: {
      ...js.configs.recommended.rules,
      // ...react.configs.recommended.rules, // Commented out since React is not yet installed

      semi: ['error', 'always'],
      quotes: ['error', 'single'],
      indent: ['error', 2],
      'no-unused-vars': ['warn'],
      eqeqeq: ['error', 'always'],
      'no-console': 'off',
      // 'react/prop-types': 'off', // Commented out since React is not yet installed
      // 'react/react-in-jsx-scope': 'off' // Commented out since React is not yet installed
    },
  },
];
