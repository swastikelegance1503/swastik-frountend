import * as Yup from 'yup';

export const schema = Yup.object().shape({
  username: Yup.string()
    .trim()
    .required('ઇમેઇલ અથવા યુઝરનેમ જરૂરી છે (Email/Username is required)'),
  password: Yup.string()
    .trim()
    .required('પાસવર્ડ જરૂરી છે (Password is required)'),
});
