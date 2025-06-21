/******************************************
 * CONFIGURACIÓN INICIAL Y FUNCIONES BÁSICAS
 ******************************************/
function getSheet(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    throw new Error(`No se encontró la hoja: "${sheetName}"`);
  }
  return sheet;
}

function onOpen() {
  installMenu();
}

function installMenu() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('KARDEX')
    .addItem('Registrar Salida', 'mostrarInterfazSalida')
    .addItem('Registrar Entrada', 'mostrarInterfazEntrada')
    .addToUi();
}

/******************************************
 * FUNCIONES PARA INTERFAZ DE ENTRADA
 ******************************************/
function mostrarInterfazEntrada() {
  const html = HtmlService.createHtmlOutputFromFile('InterfazEntrada')
    .setWidth(600)
    .setHeight(500);
  SpreadsheetApp.getUi().showModalDialog(html, 'Registrar Entrada');
}

function registrarEntradaDesdeInterfaz(datos) {
  try {
    const {codigo, cantidad, oc, obs1, obs2} = datos;
    const bdSheet = getSheet("BD");
    const movimientosSheet = getSheet("MOVIMIENTOS");
    
    if (!codigo || !cantidad) throw new Error("Código y cantidad son obligatorios");
    
    const productos = buscarProductos(codigo);
    if (productos.length === 0) throw new Error("Producto no encontrado");
    
    const producto = productos[0];
    const filaBD = producto.filaBD;
    const cantidadActual = bdSheet.getRange(filaBD, 5).getValue();
    const nuevoValor = parseFloat(cantidadActual) + parseFloat(cantidad);
    
    // Actualizar stock en BD
    bdSheet.getRange(filaBD, 5).setValue(nuevoValor);
    
    // Registrar movimiento histórico
    movimientosSheet.appendRow([
      new Date(),
      codigo,
      producto.descripcion,
      producto.und,
      cantidad,
      producto.costo,
      cantidad * producto.costo,
      "", // Guía de remisión
      "", // Factura
      oc || "",
      "", // SIAF
      producto.clasificador || "",
      "", // NEA
      `${obs1 || ""} - ${obs2 || ""}`.trim(),
      "ENTRADA",
      ""  // Pecosa (vacío para entradas)
    ]);
    
    return "✅ Entrada registrada correctamente";
    
  } catch (e) {
    return `❌ Error: ${e.message}`;
  }
}

/******************************************
 * FUNCIONES PARA INTERFAZ DE SALIDA (PECOSA)
 ******************************************/
function mostrarInterfazSalida() {
  const html = HtmlService.createHtmlOutputFromFile('InterfazSalida')
    .setWidth(1000)
    .setHeight(700);
  SpreadsheetApp.getUi().showModalDialog(html, 'Registro de Salida');
}

function obtenerUnidadesOrganicas() {
  const bdSheet = getSheet("BD");
  const rango = bdSheet.getRange("O3:O33");
  const valores = rango.getValues().flat().filter(Boolean);
  return [...new Set(valores)].sort();
}

function generarPecosaDesdeInterfaz(datos) {
  try {
    const {pecosa, dia, mes, anio, solicitante, observacion, referencia, articulos} = datos;
    const bdSheet = getSheet("BD");
    const movimientosSheet = getSheet("MOVIMIENTOS");
    const plantillaSheet = getSheet("PLANTILLA_PECOSA");
    
    if (!pecosa) throw new Error("N° Pecosa es obligatorio");
    if (!articulos?.length) throw new Error("Debe agregar artículos");
    
    const fecha = new Date(anio, mes - 1, dia);
    let totalGeneral = 0;
    
    // Procesar cada artículo
    articulos.forEach(art => {
      const productos = buscarProductos(art.codigo);
      if (productos.length === 0) throw new Error(`Producto ${art.codigo} no encontrado`);
      
      const producto = productos[0];
      const filaBD = producto.filaBD;
      const cantidadActual = bdSheet.getRange(filaBD, 5).getValue();
      const costoUnitario = producto.costo;
      const nuevoValor = cantidadActual - art.cantidad;
      
      if (nuevoValor < 0) throw new Error(`Stock insuficiente para ${art.codigo} (Stock actual: ${cantidadActual})`);
      
      // Actualizar stock en BD
      bdSheet.getRange(filaBD, 5).setValue(nuevoValor);
      
      // Registrar movimiento histórico
      movimientosSheet.appendRow([
        fecha,
        art.codigo,
        producto.descripcion,
        producto.und,
        -art.cantidad,
        costoUnitario,
        art.cantidad * costoUnitario,
        "", "", art.oc || "", "", producto.clasificador || "",
        `Salida Pecosa ${pecosa} - Sol: ${solicitante}`,
        "SALIDA",
        pecosa
      ]);
      
      art.costo = costoUnitario; // Para la Pecosa
    });
    
    // Generar Pecosa
    const nuevaPecosa = plantillaSheet.copyTo(SpreadsheetApp.getActiveSpreadsheet());
    nuevaPecosa.setName(`PECOSA_${pecosa}`);
    
    // Llenar datos en Pecosa
    nuevaPecosa.getRange("I1").setValue(pecosa);
    nuevaPecosa.getRange("M1").setValue(dia);
    nuevaPecosa.getRange("O1").setValue(mes);
    nuevaPecosa.getRange("Q1").setValue(anio);
    nuevaPecosa.getRange("D8").setValue(solicitante);
    nuevaPecosa.getRange("D9").setValue(observacion);
    nuevaPecosa.getRange("J9").setValue(referencia);
    
    // Llenar artículos en Pecosa
    let fila = 14;
    articulos.forEach((art, index) => {
      const total = art.cantidad * art.costo;
      totalGeneral += total;
      
      nuevaPecosa.getRange(`A${fila}`).setValue(art.codigo);
      nuevaPecosa.getRange(`B${fila}`).setValue(index + 1);
      nuevaPecosa.getRange(`C${fila}`).setValue(art.oc || "");
      nuevaPecosa.getRange(`E${fila}`).setValue(art.descripcion);
      nuevaPecosa.getRange(`K${fila}`).setValue(art.cantidad);
      nuevaPecosa.getRange(`M${fila}`).setValue(art.und);
      nuevaPecosa.getRange(`P${fila}`).setValue(total);
      
      fila++;
    });
    
    // Totales en Pecosa
    nuevaPecosa.getRange("P47").setValue(totalGeneral);
    nuevaPecosa.getRange("B47").setValue(numeroALetras(totalGeneral));
    
    return `✅ Pecosa ${pecosa} generada correctamente`;
    
  } catch (e) {
    return `❌ Error: ${e.message}`;
  }
}

/******************************************
 * FUNCIONES COMPARTIDAS
 ******************************************/
function buscarProductos(termino) {
  try {
    if (!termino || termino.length < 2) return [];
    
    const bdSheet = getSheet("BD");
    const data = bdSheet.getRange(3, 2, bdSheet.getLastRow()-2, 14).getValues();
    
    const resultados = [];
    const terminoLower = termino.toLowerCase();
    const productosMap = {};
    
    // Procesar datos de BD (solo stock actual)
    data.forEach((fila, i) => {
      const codigo = fila[0]?.toString().trim() || '';
      const descripcion = fila[1]?.toString().trim() || '';
      
      if (!codigo) return;
      
      // Solo consideramos el stock actual (valores positivos en BD)
      const cantidad = Number(fila[3]) || 0;
      const costoUnitario = Number(fila[4]) || 0;
      
      if (!productosMap[codigo]) {
        productosMap[codigo] = {
          descripcion: descripcion,
          und: fila[2] || "",
          costo: costoUnitario,
          clasificador: fila[10] || "",
          stock: cantidad > 0 ? cantidad : 0, // Solo stock positivo
          filaBD: i + 3 // Fila en BD
        };
      }
    });
    
    // Filtrar por término
    for (const [codigo, producto] of Object.entries(productosMap)) {
      if (codigo.toLowerCase().includes(terminoLower) || 
          producto.descripcion.toLowerCase().includes(terminoLower)) {
        resultados.push({
          codigo: codigo,
          ...producto
        });
      }
    }
    
    return resultados;
    
  } catch (e) {
    console.error("Error en buscarProductos:", e);
    return [];
  }
}

/******************************************
 * FUNCIÓN PARA CONVERTIR NÚMERO A LETRAS
 ******************************************/
function numeroALetras(numero) {
  const unidades = ['', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE'];
  const decenas = ['', 'DIEZ', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
  const especiales = ['DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISEIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE'];
  const centenas = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];
  
  const entero = Math.floor(numero);
  const decimal = Math.round((numero - entero) * 100);
  
  if (entero === 0) return 'CERO SOLES';
  
  let palabras = '';
  let parteEntera = entero;
  
  // Miles
  if (parteEntera >= 1000) {
    const miles = Math.floor(parteEntera / 1000);
    parteEntera %= 1000;
    
    if (miles === 1) {
      palabras += 'MIL ';
    } else {
      palabras += numeroALetras(miles) + ' MIL ';
    }
  }
  
  // Centenas
  if (parteEntera >= 100) {
    const centena = Math.floor(parteEntera / 100);
    parteEntera %= 100;
    
    if (centena === 1 && parteEntera === 0) {
      palabras += 'CIEN ';
    } else {
      palabras += centenas[centena] + ' ';
    }
  }
  
  // Decenas y unidades
  if (parteEntera >= 10 && parteEntera <= 19) {
    palabras += especiales[parteEntera - 10] + ' ';
  } else {
    const decena = Math.floor(parteEntera / 10);
    const unidad = parteEntera % 10;
    
    if (decena > 0) {
      palabras += decenas[decena];
      if (unidad > 0) palabras += ' Y ';
    }
    
    if (unidad > 0) {
      palabras += unidades[unidad] + ' ';
    }
  }
  
  palabras += 'SOLES';
  
  // Parte decimal
  if (decimal > 0) {
    palabras += ` CON ${decimal.toString().padStart(2, '0')}/100`;
  }
  
  return palabras;
}