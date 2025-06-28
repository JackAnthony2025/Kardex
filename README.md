Sistema de Gestión de Kardex con Google Apps Script

![Google Sheets](https://img.shields.io/badge/Google%20Sheets-34A853?style=for-the-badge&logo=google-sheets&logoColor=white)
![Google Apps Script](https://img.shields.io/badge/Google%20Apps%20Script-4285F4?style=for-the-badge&logo=google-cloud&logoColor=white)

Aplicativo para control de inventario bajo el método **PEPS** (Primeras Entradas, Primeras Salidas), integrado con Google Sheets mediante interfaces HTML personalizadas.

Características principales
- **Registro de entradas/salidas** con validación de stock
- **Generación automática de PECOSAS** (Plantilla configurable)
- **Búsqueda inteligente** de productos por código/descripción
- **Conversión de montos a letras** para documentos formales
- **Histórico de movimientos** auditables

📂 Estructura de archivos
| Archivo | Descripción |
|---------|-------------|
| `GS_FINAL.js` | Lógica principal (backend) |
| `InterfazEntrada.html` | Formulario para registro de entradas |
| `InterfazSalida.html` | Interfaz para generación de Pecosas |

Instalación
1. **Crear proyecto en Google Apps Script**:
   - Ve a [script.google.com](https://script.google.com)
   - Copia los 3 archivos al proyecto

2. **Configurar hoja de cálculo**:
   - Requiere 4 hojas con estos nombres exactos:
     - `BD` (Base de datos de productos)
     - `MOVIMIENTOS` (Histórico)
     - `PLANTILLA_PECOSA` (Formato base)
     - `CONFIG` (Opcional para parámetros)

3. **Asignar triggers**:
   ```javascript
   function setTriggers() {
     ScriptApp.newTrigger('onOpen')
       .forSpreadsheet(SpreadsheetApp.getActive())
       .onOpen()
       .create();
   }
   ```

## 🖥️ Interfaces
### Interfaz de Entrada
![Entrada](https://i.imgur.com/ejemplo1.png)
- Validación de stock existente
- Campos para OC y observaciones

### Interfaz de Salida (Pecosa)
![Salida](https://i.imgur.com/ejemplo2.png)
- Selector de unidades orgánicas
- Tabla editable de artículos
- Cálculo automático de totales

## 📊 Estructura de datos requerida
**Hoja BD** (Ejemplo):
| Código | Descripción | Unidad | Stock | Costo | ... |
|--------|-------------|--------|-------|-------|-----|
| P-001  | Laptop HP   | UN     | 15    | 2500  | ... |

## 🎓 Contexto académico
| Item | Detalle |
|------|---------|
| **Universidad** | UTP |
| **Curso** | Taller de investigación |
| **Autor** | Jack Anthony Espinoza |
| **Método** | PEPS (FIFO) |

## ⚠️ Limitaciones
- Requiere conexión a Internet
- Máximo 500 registros por transacción (límite de Apps Script)
- No soporta inventario negativo

## 📌 Recomendaciones
1. Realizar respaldos semanales de la hoja de cálculo
2. Usar nombres exactos en las hojas requeridas
3. Configurar permisos de ejecución manualmente la primera vez
