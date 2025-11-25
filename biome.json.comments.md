# Documentación de biome.json

## CONFIGURACIÓN DE BIOME

Biome es una herramienta de formateo y linting para JavaScript/TypeScript.
Reemplaza a ESLint + Prettier con una sola herramienta más rápida.

Documentación: https://biomejs.dev/

## CONFIGURACIÓN DE CONTROL DE VERSIONES (VCS)

- `enabled: true` - Habilitar integración con Git
- `clientKind: "git"` - Usar Git como sistema de control de versiones
- `useIgnoreFile: true` - Respetar archivos en .gitignore (no formatear/lintar archivos ignorados)

## CONFIGURACIÓN DE ARCHIVOS

- `ignoreUnknown: false` - No ignorar archivos con extensiones desconocidas

## CONFIGURACIÓN DEL FORMATEADOR

El formateador automáticamente ajusta el estilo del código para mantener consistencia.

- `enabled: true` - Habilitar formateo automático
- `indentStyle: "space"` - Usar espacios en lugar de tabs para indentación
- `indentWidth: 2` - Usar 2 espacios por nivel de indentación
- `lineEnding: "lf"` - Usar line feed (LF) para finales de línea (Unix-style)
- `lineWidth: 100` - Ancho máximo de línea antes de hacer wrap (100 caracteres)

## CONFIGURACIÓN DEL LINTER

El linter detecta errores y problemas potenciales en el código.

- `enabled: true` - Habilitar linting
- `recommended: true` - Usar reglas recomendadas (buenas prácticas)

### Reglas de corrección
- `useExhaustiveDependencies: "warn"` - Advertir si faltan dependencias en useEffect/useMemo/etc

### Reglas de estilo
- `useImportType: "off"` - Desactivar: no forzar uso de 'import type' en TypeScript

### Reglas sospechosas
- `noExplicitAny: "warn"` - Advertir cuando se usa 'any' explícitamente (TypeScript)

## CONFIGURACIÓN ESPECÍFICA DE JAVASCRIPT

- `quoteStyle: "single"` - Usar comillas simples para strings: 'texto'
- `jsxQuoteStyle: "double"` - Usar comillas dobles en JSX: <div className="texto">
- `trailingCommas: "es5"` - Agregar comas finales donde ES5 lo permite (objetos, arrays)
- `semicolons: "always"` - Siempre usar punto y coma al final de las líneas
- `arrowParentheses: "always"` - Siempre usar paréntesis en arrow functions: (x) => x

