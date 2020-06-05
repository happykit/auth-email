// enable importing css into typescript
// https://stackoverflow.com/a/41946697
declare module "*.css" {
  const content: string
  export default content
}
