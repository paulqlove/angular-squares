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
/ tailwind.config.js

const colors = {
  primary: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
    950: '#020617',
  },
  secondary: {
    50: '#f0f9ff',
    100: '#e0f2fe',
    200: '#bae6fd',
    300: '#7dd3fc',
    400: '#38bdf8',
    500: '#0ea5e9',
    600: '#0284c7',
    700: '#0369a1',
    800: '#075985',
    900: '#0c4a6e',
    950: '#082f49',
  },
  accent: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
    950: '#172554',
  },
  // You can add more custom color palettes here
};

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{html,ts}',
  ],
  theme: {
    extend: {
      colors: colors,
      // You can also create semantic color mappings
      backgroundColor: {
        'page': colors.primary[50],
        'card': colors.primary[100],
        'card-hover': colors.primary[200],
        'input': colors.primary[50],
        'input-hover': colors.primary[100],
      },
      textColor: {
        'default': colors.primary[900],
        'muted': colors.primary[500],
        'link': colors.secondary[600],
        'link-hover': colors.secondary[700],
      },
      borderColor: {
        'default': colors.primary[200],
        'hover': colors.primary[300],
        'focus': colors.secondary[500],
      },
    },
  },
  plugins: [],
}

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

# TypeScript File Organization Guidelines

## Component Class Structure

Each TypeScript file should follow this organized structure with clear section demarcation and alphabetical ordering within sections.

```typescript
import { Component, OnInit } from '@angular/core';
import { ExampleService } from './example.service';

@Component({
  selector: 'app-example',
  templateUrl: './example.component.html',
  styleUrls: ['./example.component.scss']
})
export class ExampleComponent implements OnInit {
  /*******************************\
   *        Constructors         *
  \*******************************/
  
  constructor(
    private exampleService: ExampleService
  ) {}

  /*******************************\
   *     Public Properties       *
  \*******************************/

  //
  // Current user's display name
  //
  public displayName: string = '';

  //
  // Loading state for the component
  //
  public isLoading: boolean = false;

  /*******************************\
   *     Public Functions        *
  \*******************************/

  //
  // Handles form submission
  //
  public async handleSubmit(): Promise<void> {
    // Implementation
  }

  //
  // Angular lifecycle hook for initialization
  //
  public ngOnInit(): void {
    // Implementation
  }

  /*******************************\
   *    Protected Properties     *
  \*******************************/

  //
  // Cache duration in milliseconds
  //
  protected cacheDuration: number = 3600000;

  /*******************************\
   *    Protected Functions      *
  \*******************************/

  //
  // Refreshes the data cache
  //
  protected refreshCache(): void {
    // Implementation
  }

  /*******************************\
   *     Private Properties      *
  \*******************************/

  //
  // Internal subscription reference
  //
  private subscription: Subscription;

  /*******************************\
   *     Private Functions       *
  \*******************************/

  //
  // Cleans up component resources
  //
  private cleanup(): void {
    // Implementation
  }

  //
  // Initializes component data
  //
  private initializeData(): void {
    // Implementation
  }
}
```

## Section Guidelines

1. **Section Headers**
   - Use the standardized comment block format shown above
   - Maintain consistent spacing and alignment
   - Each section should be clearly separated from others

2. **Property and Function Documentation**
   - Every property and function should have a comment block above it
   - Use the `//` format with empty lines above and below the comment
   - Keep descriptions clear and concise

3. **Alphabetical Ordering**
   - Within each section, arrange properties and functions alphabetically
   - Exception: constructors always come first
   - Lifecycle hooks should maintain their logical order within public functions

4. **Naming Conventions**
   - Use clear, descriptive names
   - Follow Angular's style guide for naming conventions
   - Prefix private properties with underscore (optional but recommended)

5. **Type Declarations**
   - Always include type declarations for properties and function returns
   - Use proper TypeScript types (avoid 'any' when possible)
   - Include proper access modifiers (public, protected, private)

## Example Service Structure

Services should follow the same organization pattern:

```typescript
@Injectable({
  providedIn: 'root'
})
export class ExampleService {
  /*******************************\
   *        Constructors         *
  \*******************************/
  
  constructor(
    private http: HttpClient
  ) {}

  /*******************************\
   *     Public Properties       *
  \*******************************/

  //
  // Observable for current user state
  //
  public currentUser$: Observable<User>;

  /*******************************\
   *     Public Functions        *
  \*******************************/

  //
  // Fetches user data from API
  //
  public async fetchUserData(): Promise<User> {
    // Implementation
  }

  // ... continue with protected and private sections
}
```

## Benefits of This Structure

1. **Readability**: Clear section demarcation makes it easy to locate code
2. **Maintainability**: Consistent structure across all files reduces cognitive load
3. **Documentation**: Built-in documentation requirements ensure code is well-documented
4. **Organization**: Alphabetical ordering makes it easy to find specific properties and functions
5. **Scalability**: Structure works well for both small and large components/services

## Implementation Tips

1. Consider creating a file template in your IDE for new components and services
2. Use ESLint/TSLint rules to enforce ordering and documentation requirements
3. Include this structure in your team's style guide
4. Create snippets for the section headers to ensure consistency
5. Regular code reviews should include checking for adherence to this structure