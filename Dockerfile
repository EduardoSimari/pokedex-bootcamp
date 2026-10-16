# Imagem base: servidor web Nginx enxuto
FROM nginx:alpine

# Copia os arquivos da aplicação para a pasta servida pelo Nginx
COPY index.html style.css script.js /usr/share/nginx/html/

# Porta padrão do Nginx
EXPOSE 80
