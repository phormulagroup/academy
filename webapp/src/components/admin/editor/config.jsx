// Editor de tópicos: portado do projeto CPR (/Users/phormula/Projetos/cpr, components/admin/editor) em 2026-10-26.
// Diferenças face ao CPR (não voltar a copiar a pasta toda por cima):
//  - Video e ImageCarousel são os blocos DA ACADEMY (blocks/video, blocks/imageCarousel), não os do CPR: todos os tópicos existentes usam só estes dois e o
//    eLearning depende deles (pages/app/course/topic.jsx procura os iframes do Vimeo e ouve "bial-carousel-progress" para só deixar avançar depois de
//    ver tudo). Usam o Section/ImagePickerField antigos em legacy/.
//  - Sem os blocos do site do CPR (Site*, Query, Form, Template), sem Embed (a política de segurança do site só deixa iframes do Vimeo), sem
//    "Templates/Secções prontas" (eram do site e guardavam modelos na BD do CPR) e sem cabeçalho/rodapé no canvas.
//  - A biblioteca de multimédia é a da Academy (components/admin/media/media.jsx); as cores vêm de --brand-* (index.css).
//  - Os textos do editor estão em português (como no CPR), não passam pelo i18n.
//
// Config do Puck partilhado entre o editor (admin) e a página do aluno.
// Separado de index.jsx de propósito: a página do aluno só precisa disto
// (blocos + render), nunca do <Puck> editor nem do puck.css.

import Root from "./root";

import Flex from "./blocks/flex";
import Columns from "./blocks/columns";
import Grid from "./blocks/grid";
import { Space } from "./blocks/space";
import Divider from "./blocks/divider";
import TableOfContents from "./blocks/tableOfContents";

import Heading from "./blocks/heading";
import Text from "./blocks/text";
import Button from "./blocks/button";
import Icon from "./blocks/icon";
import IconText from "./blocks/iconText";
import IconList from "./blocks/iconList";
import Quote from "./blocks/quote";
import Callout from "./blocks/callout";
import Table from "./blocks/table";

import Image from "./blocks/image";
import Gallery from "./blocks/gallery";
import ImageCarousel from "./blocks/imageCarousel";
import Video from "./blocks/video";
import Audio from "./blocks/audio";
import PdfEmbed from "./blocks/pdfEmbed";
import BeforeAfter from "./blocks/beforeAfter";
import Logos from "./blocks/logos";

import Tabs from "./blocks/tabs";
import Accordion from "./blocks/accordion";
import FlipCard from "./blocks/flipCard";
import Hotspots from "./blocks/hotspots";
import Timeline from "./blocks/timeline";

import Hero from "./blocks/hero";
import CallToAction from "./blocks/callToAction";
import ImageBox from "./blocks/imageBox";
import Card from "./blocks/card";
import Testimonials from "./blocks/testimonials";
import Counter from "./blocks/counter";
import ProgressBar from "./blocks/progressBar";
import PricingTable from "./blocks/pricingTable";
import StarRating from "./blocks/starRating";
import Countdown from "./blocks/countdown";
import Stats from "./blocks/stats";

import "./core/elements.css";

export const config = {
  root: Root,
  categories: {
    layout: {
      title: "Estrutura",
      components: ["Flex", "Columns", "Grid", "Tabs", "Accordion", "Space", "Divider", "TableOfContents"],
    },
    basic: {
      title: "Básico",
      components: ["Heading", "Text", "Button", "Image", "Icon", "IconText", "IconList"],
    },
    learning: {
      title: "Destaques de texto",
      components: ["Callout", "Quote", "FlipCard", "Hotspots", "Timeline", "Table"],
    },
    media: {
      title: "Multimédia",
      components: ["Video", "Audio", "Gallery", "ImageCarousel", "PdfEmbed", "BeforeAfter", "Logos"],
    },
    marketing: {
      title: "Conteúdo e destaque",
      components: ["Hero", "CallToAction", "ImageBox", "Card", "Testimonials", "Counter", "ProgressBar", "PricingTable", "StarRating", "Countdown", "Stats"],
    },
  },
  components: {
    Flex,
    Columns,
    Grid,
    Space,
    Divider,
    TableOfContents,
    Heading,
    Text,
    Button,
    Icon,
    IconText,
    IconList,
    Quote,
    Callout,
    Table,
    Image,
    Gallery,
    ImageCarousel,
    Video,
    Audio,
    PdfEmbed,
    BeforeAfter,
    Logos,
    Tabs,
    Accordion,
    FlipCard,
    Hotspots,
    Timeline,
    Hero,
    CallToAction,
    ImageBox,
    Card,
    Testimonials,
    Counter,
    ProgressBar,
    PricingTable,
    StarRating,
    Countdown,
    Stats,
  },
};

// Ícone (nome lucide) de cada widget no painel lateral do editor.
export const DRAWER_ICONS = {
  Flex: "square-dashed",
  Columns: "columns-3",
  Grid: "layout-grid",
  Space: "move-vertical",
  Divider: "minus",
  TableOfContents: "list-tree",
  Heading: "heading",
  Text: "pilcrow",
  Button: "rectangle-horizontal",
  Image: "image",
  Icon: "star",
  IconText: "badge-check",
  IconList: "list-checks",
  Quote: "quote",
  Callout: "message-square-warning",
  Tabs: "panels-top-left",
  Accordion: "chevrons-up-down",
  FlipCard: "refresh-ccw",
  Hotspots: "map-pin",
  Timeline: "git-commit-vertical",
  Table: "table",
  Video: "circle-play",
  Audio: "audio-lines",
  Gallery: "images",
  ImageCarousel: "gallery-horizontal-end",
  PdfEmbed: "file-text",
  BeforeAfter: "split",
  Logos: "building-2",
  Hero: "panel-top",
  CallToAction: "megaphone",
  ImageBox: "square-user",
  Card: "id-card",
  Testimonials: "messages-square",
  Counter: "hash",
  ProgressBar: "chart-no-axes-gantt",
  PricingTable: "badge-euro",
  StarRating: "star-half",
  Countdown: "timer",
  Stats: "chart-column",
};

export default config;
