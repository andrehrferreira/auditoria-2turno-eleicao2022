# Auditoria independente 2 turno das eleições 2022

* Auditoria 1 turno: https://github.com/andrehrferreira/auditoria-1turno-eleicao2022

## Instalação de dependências 

Os scripts utilizam a linguagem Javascript, utilizando Node.JS para interpretação, e analise dos dados, para conferencia dos resultados execute os comandos abaixo para instalação das dependências do projeto  

```
npm install
```

## Coleta de dados

Para o segundo turno foram utilizados os Logs das urnas disponível em https://dadosabertos.tse.jus.br/dataset/resultados-2022-correspondencias-esperadas-e-efetivadas-2-turno porém foi utilizado um script para realizado 
download automatizado dos arquivos .logjez

```
$ php download_logjez.php
```

Os arquivos .logjez utiliza o padrão 7z de compactação e internamente possui um arquivo texto ISO-8859-1, contendo os Logs da urna, com data e hora de cada voto computado, para realizar o parseamento dos dados
e geração dos arquivo de finais do relatório foi utilizado o script leituraLogs.js

```
$ node leituraLogs.js
```