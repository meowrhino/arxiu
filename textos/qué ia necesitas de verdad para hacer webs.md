# qué ia necesitas de verdad para hacer webs

Hago webs a mano y uso modelos de IA todos los días. Y cada dos por tres alguien me pregunta si no sería mejor "tener mi propio modelo", local, en mi portátil, entrenado con mis webs. Me puse a entender cómo funciona esto de verdad para contestar con fundamento. La respuesta corta: no, y entender por qué te ahorra dinero y semanas.

## Por qué el modelo bueno es el grande

Un modelo de lenguaje es una colección enorme de números ajustables, los parámetros. Uno de 70.000 millones de parámetros tiene 70.000 millones de perillas que se giraron durante el entrenamiento para fallar menos. La regla es bastante predecible: más parámetros, más datos y más cómputo dan menos errores, con rendimientos decrecientes. Para bajar el error a la mitad puedes necesitar diez veces de todo.

Y hay un detalle físico que lo cambia todo: para funcionar, todos esos números tienen que estar en memoria a la vez. Un modelo de 70.000 millones pide unos 140 GB en precisión normal, o unos 40 comprimido a 4 bits. Los modelos de frontera, los que usas en Claude o en ChatGPT, son mucho más grandes y viven repartidos entre muchas tarjetas gráficas en un centro de datos. Un portátil con 16 o 32 GB corre modelos pequeños, hasta unos 30.000 millones comprimidos. No es una limitación de software: es que no caben.

## Lo que sí puedes correr en casa

Los modelos locales gratis han cruzado un umbral útil. Con Ollama, en un Mac de 32 GB, Qwen3-Coder de 30.000 millones (que solo activa unos 3.000 millones por palabra, por eso es rápido) resuelve bien el 70 u 80 por ciento del trabajo cotidiano: bocetos, trozos de HTML y CSS, autocompletar, documentar, renombrar. Para autocompletado en el editor, un modelo pequeño de 7.000 millones hecho para eso rinde mejor que uno de chat grande.

Donde se quedan cortos: razonar durante mucho rato, mantener coherente un proyecto con muchos archivos, instrucciones con matices y, sobre todo, gusto. Para eso los modelos grandes de pago siguen estando claramente por delante. La división que me funciona: el modelo pequeño y barato para lo mecánico, el mediano como caballo de batalla, el grande solo cuando la diferencia cambia el resultado. Y vigilar la factura: lo que cuesta es lo que el modelo escribe, no lo que lee.

## Lo de entrenar tu propio modelo

Tres opciones, de mejor a peor:

1. **No entrenar nada.** Darle al modelo grande diez o quince de tus mejores webs como ejemplos y pedirle que combine. Cero coste, cero riesgo, cambias los ejemplos cuando quieras. Para cien ejemplos o menos es casi seguro lo más efectivo. Un documento con tu lenguaje visual (tipografía, color, movimiento) pasado como contexto hace más que cualquier entrenamiento.
2. **Afinar un modelo pequeño** (lo que llaman LoRA). En un Mac se hace en una hora con herramientas gratuitas de Apple. Es un proyecto bonito para aprender. Pero afinar enseña estilo, no inteligencia: el modelo imitará cómo escribes HTML y no propondrá nada que no supiera ya. Y con cien ejemplos tiende a memorizar en vez de generalizar.
3. **Entrenar desde cero.** Millones de dólares, miles de tarjetas gráficas, billones de palabras. No es una opción para una persona.

Un aviso legal que no es menor: en España el autor es el primer titular de los derechos de una web, y que un cliente te la haya pagado no se los transfiere si no hay cesión por escrito. Para inspirar o entrenar, usa solo webs tuyas o con permiso.

## Lo que te van a decir y la respuesta

1. "Con un Mac potente corres lo mismo que ChatGPT." -- No. Ni con el Mac más caro de la tienda. Corres modelos pequeños, que están bien para lo que están bien.
2. "La IA hace diseños genéricos." -- Si no le dices nada, sí: tiende a lo que más ha visto. Pídele tipografía, color y movimiento con criterio y se le pasa.
3. "Entrena un modelo con tus webs y tendrás tu estilo." -- Tendrás tu estilo con menos cabeza. Dale tus webs como ejemplos a un modelo grande y tendrás tu estilo con toda la cabeza.

## Y ya

El modelo local es para lo mecánico y para cuando el código es de un cliente y no debe salir de tu máquina. El modelo grande es para pensar. Entrenar el tuyo es un hobby, no una herramienta. Y tu estilo no está en un modelo: está en los ejemplos que le das.

---

Fuentes: Hoffmann y otros, "Training Compute-Optimal Large Language Models" (DeepMind, 2022, la regla de Chinchilla); documentación de Ollama y de MLX (Apple); WebSight (arXiv 2403.09029) sobre entrenar con HTML sintético; survey sobre ajuste eficiente de parámetros (arXiv 2504.14117); Ley de Propiedad Intelectual española sobre la titularidad de la obra. Cifras de mediados de 2026; los modelos cambian cada pocos meses, la física de la memoria no. Texto redactado con una IA a partir de esas fuentes, a petición de meowrhino. arxiu es un archivo libre: sube el tuyo, con citas o sin ellas.
