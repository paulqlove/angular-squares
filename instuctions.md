# Project Structure Guide for Angular Projects in Cursor IDE

## Overview
This guide outlines how to structure an Angular project in Cursor IDE for maintainability, scalability, and mobile responsiveness. It emphasizes breaking the code into smaller components, using Tailwind CSS for styling, and integrating Firebase for backend services.

---

## Project Structure

The Angular project should be organized as follows:

```
src/
├── app/
│   ├── core/                 # Core module for services and singletons
│   ├── shared/               # Shared module for reusable components, directives, and pipes
│   ├── features/             # Feature-specific modules and components
│   │   ├── feature-name/     # Example of a feature module
│   │   │   ├── components/   # Smaller, reusable components for the feature
│   │   │   │   ├── component-name/
│   │   │   │   │   ├── component-name.component.ts
│   │   │   │   │   ├── component-name.component.html
│   │   │   │   │   ├── component-name.component.scss
│   │   │   │   │   └── component-name.component.spec.ts
│   │   │   └── feature-name.module.ts
│   ├── app.component.ts      # Root component
│   ├── app.component.html
│   ├── app.component.scss
│   ├── app.module.ts         # Root module
│   └── app-routing.module.ts # Application-wide routing
├── environments/             # Environment configurations
├── assets/                   # Static assets (images, fonts, etc.)
├── styles/                   # Global styles and Tailwind configuration
│   ├── tailwind.config.js
│   ├── globals.scss          # Global SCSS variables and mixins
├── index.html                # Main HTML file
├── main.ts                   # Main entry point
└── angular.json              # Angular configuration
```

---

## Component Structure

Each component should follow the Angular CLI default structure. Example for a component named `example-component`:

```
example-component/
├── example-component.component.ts
├── example-component.component.html
├── example-component.component.scss
└── example-component.component.spec.ts
```

### Example Component
#### TypeScript (`.ts`)
The component class should encapsulate logic, handle state, and interact with services.

```typescript
import { Component } from '@angular/core';

@Component({
  selector: 'app-example-component',
  templateUrl: './example-component.component.html',
  styleUrls: ['./example-component.component.scss']
})
export class ExampleComponent {
  // Component logic here
}
```

#### HTML (`.html`)
Use semantic HTML and apply Tailwind classes for styling.

```html
<div class="p-4 bg-gray-100 rounded-lg shadow-lg">
  <h1 class="text-lg font-bold">Example Component</h1>
  <p class="text-sm text-gray-600">This component demonstrates the structure.</p>
</div>
```

#### SCSS (`.scss`)
Include component-specific styles, keeping them minimal due to Tailwind usage.

```scss
:host {
  display: block;
  @apply max-w-md mx-auto;
}
```

---

## Tailwind CSS Setup

1. Install Tailwind CSS:
   ```bash
   npm install tailwindcss postcss autoprefixer
   npx tailwindcss init
   ```

2. Configure `tailwind.config.js`:
   ```javascript
   module.exports = {
     content: [
       './src/**/*.{html,ts}'
     ],
     theme: {
       extend: {}
     },
     plugins: []
   };
   ```

3. Add Tailwind to `styles/globals.scss`:
   ```scss
   @tailwind base;
   @tailwind components;
   @tailwind utilities;
   ```

---

## Firebase Integration

1. Install Firebase:
   ```bash
   npm install firebase @angular/fire
   ```

2. Add Firebase configuration to `environments/environment.ts`:
   ```typescript
   export const environment = {
     production: false,
     firebase: {
       apiKey: 'YOUR_API_KEY',
       authDomain: 'YOUR_AUTH_DOMAIN',
       projectId: 'YOUR_PROJECT_ID',
       storageBucket: 'YOUR_STORAGE_BUCKET',
       messagingSenderId: 'YOUR_MESSAGING_SENDER_ID',
       appId: 'YOUR_APP_ID'
     }
   };
   ```

3. Import Firebase modules in `app.module.ts`:
   ```typescript
   import { NgModule } from '@angular/core';
   import { BrowserModule } from '@angular/platform-browser';
   import { AngularFireModule } from '@angular/fire/compat';
   import { AngularFireAuthModule } from '@angular/fire/compat/auth';
   import { environment } from '../environments/environment';

   @NgModule({
     declarations: [
       // Components
     ],
     imports: [
       BrowserModule,
       AngularFireModule.initializeApp(environment.firebase),
       AngularFireAuthModule
     ],
     bootstrap: [AppComponent]
   })
   export class AppModule {}
   ```

---

## Best Practices

1. **Break Components Into Smaller Units**: Keep components focused and reusable.
2. **Mobile Responsiveness**: Use Tailwind's responsive utilities (`sm`, `md`, `lg`, etc.).
3. **Keep Styles Scoped**: Minimize global styles and leverage Tailwind for consistency.
4. **Organize Firebase Logic**: Create a dedicated service for Firebase interactions.

---

## Conclusion

This structure ensures clean, maintainable, and scalable Angular projects while leveraging modern tools like Tailwind CSS and Firebase.
