<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1rJp7pHoy4lauxAwws35kstFV3IRlH52O

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Diseño de cartas

El mazo se planifica con 50 espacios distribuidos equitativamente entre cinco facciones/grupos:

- **Humanos** (10 slots)
- **Androides** (10 slots)
- **Alien Humanoide** (10 slots)
- **Alien Arácnido** (10 slots)
- **Alien Slimoide** (10 slots)

Cada grupo reserva los mismos roles para sus 10 cartas:

- 3 cartas **melee**
- 2 cartas **tiradores**
- 1 carta **tanque**
- 2 cartas **estructuras**
- 2 cartas **hechizos**

Esta distribución fija mantiene la paridad entre facciones y facilita definir atributos específicos (facción y subtipo alienígena) en las cartas individuales.
